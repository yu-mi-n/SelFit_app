from django.core.management.base import BaseCommand
from missions.models import Mission
from missions.consts import MISSION_LIST

class Command(BaseCommand):
    help = 'consts.py の内容をデータベースに反映します（説明文対応版）'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        self.stdout.write("ミッションの同期を開始します...")

        # 変数を3つ受け取る形に変更
        for title, difficulty, description in MISSION_LIST:
            
            # 難易度と説明文を更新対象にする
            obj, created = Mission.objects.update_or_create(
                title=title,
                defaults={
                    'difficulty': difficulty,
                    'description': description
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'新規作成: {title}'))
            else:
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS('----------------------------------'))
        self.stdout.write(self.style.SUCCESS(f'完了！ 新規: {created_count}件, 更新/確認: {updated_count}件'))