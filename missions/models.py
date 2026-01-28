from django.db import models

class Mission(models.Model):#運営側が登録する運動メニュー
    title = models.CharField(verbose_name="ミッション名", max_length=100)
    description = models.TextField(verbose_name="詳細説明")
    difficulty = models.IntegerField(verbose_name="難易度", default=1) # 1~3などで管理
    
    def __str__(self):
        return self.title

class MissionLog(models.Model):
    """
    ユーザーの達成履歴
    """
    # 【重要】他アプリ(accounts)のモデルを文字列で指定
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='mission_logs')
    
    mission = models.ForeignKey(Mission, on_delete=models.SET_NULL, null=True)
    
    completed_at = models.DateTimeField(verbose_name="達成日時", auto_now_add=True)
    comment = models.CharField(verbose_name="達成コメント", max_length=200, blank=True)

    def __str__(self):
        mission_title = self.mission.title if self.mission else "削除されたミッション"
        return f"{self.user} - {mission_title}"