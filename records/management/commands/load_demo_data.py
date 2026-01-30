from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files import File  # ファイル操作用
from django.conf import settings
from records.models import DailyRecord
import datetime
import random
import os

class Command(BaseCommand):
    help = 'mikiユーザーのデータを削除し、2025年版のデモデータ（画像付き）を一括登録します'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # 1. ユーザー 'miki' を取得
        try:
            user = User.objects.get(username='miki')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("エラー: ユーザー 'miki' が見つかりません。"))
            return

        # 画像フォルダのパス (manage.pyと同じ階層の 'demo_images' フォルダ)
        images_dir = os.path.join(settings.BASE_DIR, 'demo_images')
        
        # 画像ファイルがあるか簡易チェック
        if not os.path.exists(images_dir):
            self.stdout.write(self.style.ERROR(f"エラー: 画像フォルダが見つかりません。\n{images_dir} にフォルダを作成し、miki_face01.png等を配置してください。"))
            return

        # ==========================================
        # 2. 【削除処理】既存データをクリア
        # ==========================================
        self.stdout.write(f"ユーザー: {user.username} の既存データを削除しています...")
        deleted_count, _ = DailyRecord.objects.filter(user=user).delete()
        self.stdout.write(self.style.WARNING(f"-> {deleted_count} 件の記録を削除しました。"))

        # ==========================================
        # 3. 【登録処理】2025年データの生成（画像付き）
        # ==========================================
        self.stdout.write("2025年のデータを生成中（画像を紐付け）...")

        # マイルストーン定義 (2025年)
        milestones = [
            (datetime.date(2025, 4, 1), 62.5),
            (datetime.date(2025, 4, 12), 61.2),
            (datetime.date(2025, 4, 25), 60.0),
            (datetime.date(2025, 5, 8), 58.8),
            (datetime.date(2025, 5, 20), 57.5),
            (datetime.date(2025, 6, 2), 56.2),
            (datetime.date(2025, 6, 15), 55.0),
            (datetime.date(2025, 6, 28), 53.5),
            (datetime.date(2025, 7, 8), 51.8),
            (datetime.date(2025, 7, 15), 50.0),
        ]

        count = 0
        
        # データ生成ループ
        for i in range(len(milestones) - 1):
            start_date, start_weight = milestones[i]
            end_date, end_weight = milestones[i+1]
            
            days_diff = (end_date - start_date).days
            weight_diff = end_weight - start_weight
            slope = weight_diff / days_diff

            for day in range(days_diff):
                current_date = start_date + datetime.timedelta(days=day)
                
                # 線形補間 + ゆらぎ
                base_weight = start_weight + (slope * day)
                if day == 0:
                    weight = start_weight
                else:
                    noise = random.uniform(-0.4, 0.4)
                    weight = round(base_weight + noise, 1)

                # 体脂肪率計算
                total_days = (datetime.date(2025, 7, 15) - datetime.date(2025, 4, 1)).days
                elapsed = (current_date - datetime.date(2025, 4, 1)).days
                progress = elapsed / total_days
                target_bf = 32.5 - ((32.5 - 22.0) * progress)
                body_fat = round(target_bf + random.uniform(-0.5, 0.5), 1)

                # レコード作成（まずは画像なしで）
                record = DailyRecord(
                    user=user,
                    date=current_date,
                    weight=weight,
                    body_fat=body_fat,
                    note=''
                )

                # ★画像登録処理: マイルストーン当日(day==0) かつ 画像ファイルがある場合
                if day == 0:
                    # ファイル名: miki_face01.png, miki_face02.png... (iは0始まりなので+1)
                    file_name = f"miki_face{i+1:02d}.png"
                    file_path = os.path.join(images_dir, file_name)

                    if os.path.exists(file_path):
                        # 画像を開いてDjangoのFileオブジェクトとして保存
                        with open(file_path, 'rb') as f:
                            # save(ファイル名, ファイル実体, save=False)
                            # モデルの画像フィールド名が 'image' である前提です
                            record.photo.save(file_name, File(f), save=False)
                        
                        record.note = f'【写真No.{i+1}】見た目の変化を記録しました。'
                    else:
                        self.stdout.write(self.style.WARNING(f"警告: 画像 {file_name} が見つかりません。スキップします。"))
                
                record.save()
                count += 1

        # 最終日（No.10）の処理
        last_date, last_weight = milestones[-1]
        last_record = DailyRecord(
            user=user,
            date=last_date,
            weight=last_weight,
            body_fat=22.0,
            note='【目標達成】最終写真'
        )
        
        # 最後の画像 (miki_face10.png)
        file_name = "miki_face10.png"
        file_path = os.path.join(images_dir, file_name)
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                last_record.photo.save(file_name, File(f), save=False)
        
        last_record.save()
        
        self.stdout.write(self.style.SUCCESS(f'完了！ 画像付きで {count + 1} 日分(2025年)のデータを登録しました。'))