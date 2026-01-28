from django.db import models
from django.conf import settings

from .consts import MEAL_TYPE_CHOICES, MEAL_TYPE_SNACK

# Create your models here.

class ConditionTag(models.Model):#体調や気分のタグ（マスタデータ）
  name = models.CharField(verbose_name="タグ名", max_length=50)
  icon = models.CharField(verbose_name="アイコン", max_length=10, blank=True, null=True)

  def __str__(self):
        return self.name
    
class DailyRecord(models.Model):#日々の記録本体
    # 【重要】他アプリ(accounts)のモデルを文字列で指定
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='records')
    
    date = models.DateField(verbose_name="記録日")
    weight = models.FloatField(verbose_name="体重(kg)", null=True, blank=True)
    body_fat = models.FloatField(verbose_name="体脂肪率(%)", null=True, blank=True)
    
    # 画像は 'media/photos/2025/12/' のようなフォルダ構成で保存される
    photo = models.ImageField(verbose_name="自撮り写真", upload_to='photos/%Y/%m/', blank=True, null=True)
    
    conditions = models.ManyToManyField(ConditionTag, verbose_name="コンディション", blank=True)
    
    note = models.TextField(verbose_name="一言メモ", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.user}"
    
    def get_mission_logs(self):
        """ この記録の日付とユーザーに紐づくミッション達成ログを取得 """
        # MissionLogモデルをインポート (循環参照に注意してメソッド内でimport)
        from missions.models import MissionLog 
        return MissionLog.objects.filter(
            user=self.user,
            completed_at__date=self.date
        ).order_by('completed_at')
    
class Meal(models.Model):
# どの日の記録に紐づくか（DailyRecordが親）
    daily_record = models.ForeignKey(DailyRecord, on_delete=models.CASCADE, related_name='meals')
    
    # 食事の写真
    image = models.ImageField(upload_to='meals/%Y/%m/')
    
    #　朝昼夕食
    meal_type = models.CharField(
        max_length=20, 
        choices=MEAL_TYPE_CHOICES, 
        default=MEAL_TYPE_SNACK
    )

    # 食事のメモ（詳細）
    memo = models.TextField(blank=True, null=True)
    
    # 登録日時（並び替え用）
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.daily_record.date} の食事"
    
class Post(models.Model): # 投稿
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(verbose_name="投稿内容")
    image = models.ImageField(upload_to='posts/%Y/%m/', blank=True, null=True, verbose_name="画像")
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_posts', blank=True, verbose_name="いいね")

    def __str__(self):
        return f"{self.user.username}の投稿 - {self.created_at}"