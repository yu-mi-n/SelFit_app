from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):# Django標準のユーザーを拡張。
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True) #プロフィール画像
    introduction = models.TextField(blank=True, max_length=500, verbose_name="自己紹介") # 自己紹介
    height = models.FloatField(blank=True, null=True, verbose_name="身長(cm)") # 身長
    target_weight = models.FloatField(verbose_name="目標体重(kg)", null=True, blank=True) # 目標体重

    level = models.PositiveIntegerField(verbose_name="レベル", default=1)
    exp = models.PositiveIntegerField(verbose_name="経験値", default=0)
    last_login_bonus_date = models.DateField(verbose_name="最終ログインボーナス日", null=True, blank=True)
    last_like_bonus_date = models.DateField(verbose_name="最終いいねボーナス日", null=True, blank=True)
    last_total_likes = models.PositiveIntegerField(verbose_name="前回確認時の合計いいね数", default=0)

    following = models.ManyToManyField(
        'self', 
        symmetrical=False, 
        related_name='followers', 
        blank=True, 
        verbose_name="フォロー中"
    )

    is_anonymous_account = models.BooleanField(
        default=False, 
        verbose_name="匿名アカウントにする（名前を伏せる）"
    )
    
    hide_profile_image = models.BooleanField(
        default=False, 
        verbose_name="プロフィール画像を非公開にする"
    )

    def __str__(self):
        return self.username
    
    def update_level(self):
        """
        現在の経験値(self.exp)に基づいてレベルを再計算し、
        レベルアップしていれば更新してTrueを返すメソッド
        """
        from missions.consts import EXP_SETTINGS
        
        current_level = self.level
        new_level = 1

        # EXP_SETTINGS = {1: 0, 2: 100, 3: 300...} のような辞書を想定
        for level, required_exp in sorted(EXP_SETTINGS.items()):
            if self.exp >= required_exp:
                new_level = level
            else:
                break
        
        if new_level > 50:
            new_level = 50

        if new_level > current_level:
            self.level = new_level
            self.save()
            return True
            
        return False

    def add_exp(self, amount):
        """ 経験値を加算し、レベルアップ判定を行うメソッド """
        self.exp += amount
        is_level_up = self.update_level()
        if not is_level_up:
            self.save()
        return is_level_up
    
    def get_level_progress(self):
        """
        現在のレベルにおける経験値の進捗率(%)を返すメソッド
        テンプレート利用例: {{ user.get_level_progress }}
        """
        from missions.consts import EXP_SETTINGS
        
        # EXP_SETTINGS が {レベル: 必要累積経験値} の辞書であると仮定
        # 例: {1: 0, 2: 100, 3: 300...}
        
        current_min_exp = EXP_SETTINGS.get(self.level, 0)
        next_min_exp = EXP_SETTINGS.get(self.level + 1, None)
        
        if next_min_exp is None:
            return 100  # 最大レベル到達時
            
        # このレベル帯で必要な経験値量
        required_exp = next_min_exp - current_min_exp
        # このレベル帯で現在獲得している経験値量
        current_gained = self.exp - current_min_exp
        
        if required_exp <= 0:
            return 100
            
        # パーセンテージ計算
        return int((current_gained / required_exp) * 100)

    def get_next_level_exp(self):
        """
        次のレベルに必要な累積経験値を返すメソッド
        """
        from missions.consts import EXP_SETTINGS
        return EXP_SETTINGS.get(self.level + 1, "MAX")

    def get_remaining_exp(self):
        """
        次のレベルアップまでに必要な残り経験値を返す
        """
        next_exp = self.get_next_level_exp()
        if next_exp == "MAX":
            return 0
        return max(0, next_exp - self.exp)

    @property
    def total_missions_cleared(self):
        """
        総ミッションクリア数を返すプロパティ
        """
        from missions.models import MissionLog
        return MissionLog.objects.filter(user=self).count()