from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.contrib import messages
from .forms import DailyRecordForm, MealForm, PostForm
from .models import DailyRecord, Meal, Post
from django.db.models import Min, Max, Avg, Q, Count

from missions.models import Mission, MissionLog
import random
import datetime 
import json 
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from .consts import ITEMS_PER_PAGE, POST_PER_PAGE
from django.db.models.functions import TruncWeek, TruncMonth

from missions.consts import EXP_SETTINGS, MISSION_REWARDS

import calendar

# ログイン後のホーム画面（記録一覧）
@login_required
def index(request):
    # 1. 基本データ取得
    records = DailyRecord.objects.filter(user=request.user).order_by('-date')

    # --- いいねボーナス処理 ---
    today = datetime.date.today()
    if request.user.last_like_bonus_date != today:
        # 現在の合計いいね数（自分以外からのいいね）を計算
        # filter=~Q(likes=request.user) で自分自身のいいねを除外してカウント
        current_total_likes = Post.objects.filter(user=request.user).aggregate(
            total=Count('likes', filter=~Q(likes=request.user))
        )['total'] or 0
        
        last_total = request.user.last_total_likes
        
        # 初回（None）の場合はボーナスなしで基準値セットのみ
        if request.user.last_like_bonus_date is None:
             request.user.last_total_likes = current_total_likes
             request.user.last_like_bonus_date = today
             request.user.save()
        else:
            diff = current_total_likes - last_total
            if diff > 0:
                gained_exp = diff * 2
                is_level_up = request.user.add_exp(gained_exp)
                
                # モーダル表示用メッセージ
                bonus_data = {
                    'increased_likes': diff,
                    'gained_exp': gained_exp
                }
                messages.success(request, json.dumps(bonus_data), extra_tags='like_bonus_event')
                
                if is_level_up:
                    messages.success(request, 'Level Up!', extra_tags='level_up_event')
            
            # 更新（減少していても最新の値に更新）
            request.user.last_total_likes = current_total_likes
            request.user.last_like_bonus_date = today
            request.user.save()

    # --- グラフ期間の初期値計算（ここを追加） ---
    # 全記録から最古と最新の日付を取得
    date_stats = records.aggregate(min_date=Min('date'), max_date=Max('date'))
    
    default_start = ''
    default_end = ''
    if date_stats['min_date']:
        default_start = date_stats['min_date'].strftime('%Y-%m-%d')
    if date_stats['max_date']:
        default_end = date_stats['max_date'].strftime('%Y-%m-%d')

    # --- パラメータ取得（デフォルト値の適用） ---
    # GETパラメータがない場合（初回アクセス時など）はデフォルト値を使う
    
    if 'graph_start' in request.GET:
        graph_start = request.GET.get('graph_start')
    else:
        graph_start = default_start

    if 'graph_end' in request.GET:
        graph_end = request.GET.get('graph_end')
    else:
        graph_end = default_end

    # 間隔の取得（指定がなければ 'daily'）
    interval = request.GET.get('interval', 'daily')


    # --- サマリー計算 ---
    summary = {
        'current_weight': None,
        'total_change': None,
        'change_sign': '',
    }
    weight_records = records.filter(weight__isnull=False)
    if weight_records.exists():
        latest_record = weight_records.first()
        oldest_record = weight_records.last()
        if latest_record:
            summary['current_weight'] = latest_record.weight
            if oldest_record:
                diff = latest_record.weight - oldest_record.weight
                summary['total_change'] = round(abs(diff), 1)
                if diff < 0: summary['change_sign'] = '-'
                elif diff > 0: summary['change_sign'] = '+'
                else: summary['change_sign'] = '±'

    # --- ミッション関連 ---
    # --- ミッション関連 (修正版: 各レベルから1つずつ選出) ---
    daily_missions = []
    
    # 1. 各難易度のIDリストを取得
    lv1_ids = list(Mission.objects.filter(difficulty=1).values_list('id', flat=True))
    lv2_ids = list(Mission.objects.filter(difficulty=2).values_list('id', flat=True))
    lv3_ids = list(Mission.objects.filter(difficulty=3).values_list('id', flat=True))
    
    # 2. 乱数シードの設定 (日付 + ユーザーID で日替わり固定にする)
    today_int = int(datetime.date.today().strftime('%Y%m%d'))
    seed_value = today_int + request.user.id
    rng = random.Random(seed_value)
    
    selected_ids = []
    
    # 3. 各レベルから1つずつランダム(固定シード)に選ぶ
    if lv1_ids:
        selected_ids.append(rng.choice(lv1_ids))
    if lv2_ids:
        selected_ids.append(rng.choice(lv2_ids))
    if lv3_ids:
        selected_ids.append(rng.choice(lv3_ids))
        
    # 4. 選ばれたIDのミッションオブジェクトを取得（難易度順に並べる）
    if selected_ids:
        daily_missions = Mission.objects.filter(id__in=selected_ids).order_by('difficulty')

    today = datetime.date.today()
    completed_ids = list(MissionLog.objects.filter(user=request.user, completed_at__date=today).values_list('mission_id', flat=True))


    # --- グラフ用データの作成 ---
    graph_qs = DailyRecord.objects.filter(user=request.user)
    
    if graph_start:
        graph_qs = graph_qs.filter(date__gte=graph_start)
    if graph_end:
        graph_qs = graph_qs.filter(date__lte=graph_end)

    dates = []
    weights = []
    body_fats = []
    condition_emojis = []
    date_ranges = []

    if interval == 'weekly':
        # 週次集計
        data = graph_qs.annotate(period=TruncWeek('date')).values('period').annotate(
            avg_weight=Avg('weight'), 
            avg_fat=Avg('body_fat')
        ).order_by('period')
        
        for d in data:
            if d['period']:
                start = d['period']
                dates.append(d['period'].strftime('%Y-%m-%d'))
                weights.append(round(d['avg_weight'], 1) if d['avg_weight'] else None)
                body_fats.append(round(d['avg_fat'], 1) if d['avg_fat'] else None)
                condition_emojis.append("")

                # start が datetime型か date型かによって挙動が変わるため、date()に変換して統一すると安全です
                start_date = start.date() if isinstance(start, datetime.datetime) else start
                end_date = start_date + datetime.timedelta(days=6)
                date_ranges.append(f"{start_date.strftime('%Y/%m/%d')}〜{end_date.strftime('%Y/%m/%d')}")

    elif interval == 'monthly':
        # 月次集計
        data = graph_qs.annotate(period=TruncMonth('date')).values('period').annotate(
            avg_weight=Avg('weight'), 
            avg_fat=Avg('body_fat')
        ).order_by('period')
        
        for d in data:
            if d['period']:
                start = d['period']
                dates.append(d['period'].strftime('%Y-%m-%d'))
                weights.append(round(d['avg_weight'], 1) if d['avg_weight'] else None)
                body_fats.append(round(d['avg_fat'], 1) if d['avg_fat'] else None)
                condition_emojis.append("")

                # 月末日を計算して文字列作成
                start_date = start.date() if isinstance(start, datetime.datetime) else start
                # その月の末日を取得 (calendar.monthrangeは (曜日, 日数) を返す)
                last_day = calendar.monthrange(start_date.year, start_date.month)[1]
                end_date = start_date.replace(day=last_day)
                date_ranges.append(f"{start_date.strftime('%Y/%m/%d')}〜{end_date.strftime('%Y/%m/%d')}")

    else: 
        # 日次（デフォルト）
        data = graph_qs.order_by('date')
        for r in data:
            dates.append(str(r.date))
            weights.append(float(r.weight) if r.weight else None)
            body_fats.append(float(r.body_fat) if r.body_fat else None)
            condition_emojis.append("".join([tag.icon for tag in r.conditions.all() if tag.icon]))
            date_ranges.append(r.date.strftime('%Y/%m/%d'))


    # --- リスト表示用（ページネーションなど） ---
    page_number = request.GET.get('page')
    target_date_str = request.GET.get('target_date')
    if target_date_str:
        try:
            target_dt = datetime.datetime.strptime(target_date_str, '%Y-%m-%d').date()
            newer_count = records.filter(date__gt=target_dt).count()
            calculated_page = (newer_count // ITEMS_PER_PAGE) + 1
            page_number = calculated_page
        except (ValueError, TypeError):
            pass

    paginator = Paginator(records, ITEMS_PER_PAGE)
    page_obj = paginator.get_page(page_number)

    # --- 標準体重範囲（BMI 18.5〜25） ---
    healthy_range = None
    # Userモデルにheight(cm)があると仮定
    if getattr(request.user, 'height', None):
        h_m = request.user.height / 100
        w_min = 18.5 * (h_m ** 2)
        w_max = 25.0 * (h_m ** 2)
        healthy_range = {'min': round(w_min, 1), 'max': round(w_max, 1)}

    # 目標体重を取得 (Userモデルに target_weight があると仮定)
    target_weight = getattr(request.user, 'target_weight', None)

    context = {
        'records': page_obj,
        'summary' : summary,
        'daily_missions': daily_missions,
        'completed_ids': completed_ids,
        'today': datetime.date.today(),

        # グラフデータ
        'dates_json': json.dumps(dates),
        'weights_json': json.dumps(weights),
        'body_fats_json': json.dumps(body_fats),
        'condition_emojis_json': json.dumps(condition_emojis),
        'date_ranges_json': json.dumps(date_ranges),
        'healthy_range_json': json.dumps(healthy_range),
        'target_weight': target_weight,
        
        # フォームの状態維持用
        'graph_start_value': graph_start,
        'graph_end_value': graph_end,
        'interval_value': interval, # ★これで選択状態が維持されます
    }
    
    return render(request, 'records/index.html', context)

@login_required
def record_add(request):
    if request.method == 'POST':
        form = DailyRecordForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            record = form.save(commit=False)
            record.user = request.user
            record.save()
            form.save_m2m()
            
            # 記録ボーナス（旧ログインボーナス）
            today = datetime.date.today()
            if record.date == today and request.user.last_login_bonus_date != today:
                # --- ストリーク（連続記録日数）計算 ---
                streak = 1
                check_date = today - datetime.timedelta(days=1)
                while DailyRecord.objects.filter(user=request.user, date=check_date).exists():
                    streak += 1
                    check_date -= datetime.timedelta(days=1)
                
                # --- ボーナス倍率計算 (3日で1.05倍 〜 30日で3倍の指数関数) ---
                multiplier = 1.0
                if streak >= 30:
                    multiplier = 3.0
                elif streak >= 3:
                    # y = a * b^x の形に当てはめる
                    # (3, 1.05), (30, 3.0) を通る曲線
                    base_ratio = 3.0 / 1.05
                    b = base_ratio ** (1/27) # 約 1.0396
                    a = 1.05 / (b ** 3)
                    multiplier = a * (b ** streak)
                
                base_exp = MISSION_REWARDS['LOGIN_BONUS']
                gained_exp = int(base_exp * multiplier)
                
                is_level_up = request.user.add_exp(gained_exp)
                request.user.last_login_bonus_date = today
                request.user.save()
                
                # ボーナス演出用のデータをメッセージに格納
                bonus_data = {
                    'gained_exp': gained_exp,
                    'streak': streak,
                    'multiplier': round(multiplier, 2)
                }
                messages.success(request, json.dumps(bonus_data), extra_tags='record_bonus_event')

                if is_level_up:
                    messages.success(request, 'Level Up!', extra_tags='level_up_event')
            
            return redirect('records:index')
    else:
        form = DailyRecordForm(initial={'date': datetime.date.today()}, user=request.user)

    latest_photo_record = DailyRecord.objects.filter(
        user=request.user
    ).exclude(photo='').order_by('-date').first()
    
    return render(request, 'records/record_add.html', {
        'form': form,
        'latest_photo_record': latest_photo_record,
    })

@login_required
def record_edit(request, pk):
    record = get_object_or_404(DailyRecord, pk=pk, user=request.user)
    if request.method == 'POST':
        form = DailyRecordForm(request.POST, request.FILES, instance=record, user=request.user)
        if form.is_valid():
            form.save()
            return redirect('records:index')
    else:
        form = DailyRecordForm(instance=record, user=request.user)

    latest_photo_record = DailyRecord.objects.filter(
        user=request.user
    ).exclude(photo='').order_by('-date').first()

    return render(request, 'records/record_add.html', {
        'form': form,
        'is_edit': True,
        'latest_photo_record': latest_photo_record  # ← 追加
    })

@login_required
@require_POST
def record_delete(request, pk):
    record = get_object_or_404(DailyRecord, pk=pk, user=request.user)
    record.delete()
    return redirect('records:index')


@login_required
def add_meal(request, record_id):# 飯記録
    # 親となる記録を取得
    record = get_object_or_404(DailyRecord, id=record_id, user=request.user)
    
    if request.method == 'POST':
        form = MealForm(request.POST, request.FILES)
        if form.is_valid():
            # まだ保存せず、インスタンスだけ作成
            meal = form.save(commit=False)
            # 紐付けを行う
            meal.daily_record = record
            meal.save()
            return redirect('records:index')
    else:
        form = MealForm()
    
    return render(request, 'records/meal_add.html', {
        'form': form,
        'record': record
    })

@login_required
def meal_edit(request, meal_id):
    # 自分の食事データのみ編集可能にする
    meal = get_object_or_404(Meal, id=meal_id, daily_record__user=request.user)
    
    if request.method == 'POST':
        form = MealForm(request.POST, request.FILES, instance=meal)
        if form.is_valid():
            form.save()
            return redirect('records:index')
    else:
        form = MealForm(instance=meal)
    
    return render(request, 'records/meal_edit.html', {
        'form': form,
        'meal': meal
    })

@login_required
def meal_delete(request, meal_id):
    meal = get_object_or_404(Meal, id=meal_id, daily_record__user=request.user)
    if request.method == 'POST':
        meal.delete()
        return redirect('records:index')
    return redirect('records:index')

@login_required
def post_create(request):
    # URLパラメータから初期値を受け取る（ミッション完了時用）
    initial_content = request.GET.get('initial_text', '')

    today = timezone.now().date()
    if Post.objects.filter(user=request.user, created_at__date=today).exists():
        # すでに投稿済みなら、ホームに戻してメッセージを表示（オプション）
        # ※Djangoのmessagesフレームワークを使う場合
        # messages.info(request, "本日のシェアは完了しています！")
        return redirect('records:post_list') # 投稿一覧へ飛ばすのが親切かもしれません

    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.user = request.user
            post.save()
            return redirect('records:index') # 投稿後はホームへ
    else:
        form = PostForm(initial={'content': initial_content})
    
    return render(request, 'records/post_create.html', {'form': form})


@login_required
def post_list(request):
    # URLパラメータ ?tab=following があればフォロー中のみ、なければ全員
    tab = request.GET.get('tab', 'all')
    
    if tab == 'following':
        # 自分 + フォローしている人（非匿名）の投稿に絞る
        posts = Post.objects.filter(
            user__in=request.user.following.all()
        ).filter(
            Q(user__is_anonymous_account=False) | Q(user=request.user)
        ).order_by('-created_at')
    else:
        # 全員の投稿
        posts = Post.objects.all()

    # 並び順と、いいね情報の最適化（N+1問題対策）
    posts = posts.select_related('user').prefetch_related('likes').order_by('-created_at')

    # 「自分がいいねしたかどうか」を判定しやすいようにセットを作成
    liked_post_ids = set(request.user.liked_posts.values_list('id', flat=True))

    # --- ★追加ロジック: 投稿制限チェック ---
    today = datetime.date.today()
    
    # 1. 本日の投稿済みチェック
    has_posted_today = Post.objects.filter(user=request.user, created_at__date=today).exists()
    
    # 2. ミッション達成チェック
    # 本日完了したミッションログの数をカウント (3つ以上でクリア)
    mission_count = MissionLog.objects.filter(user=request.user, completed_at__date=today).count()
    is_mission_cleared = (mission_count >= 3)

    # --- ★追加: ページネーション処理 (1ページ10件) ---
    paginator = Paginator(posts, POST_PER_PAGE) 
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'records/post_list.html', {
        'posts': page_obj,
        'tab': tab,
        'liked_post_ids': liked_post_ids,
        # ★テンプレートへ渡すフラグ
        'has_posted_today': has_posted_today,
        'is_mission_cleared': is_mission_cleared,
    })

@login_required
def like_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # ユーザーがすでにいいねしているか確認
    if request.user in post.likes.all():
        # 既にいいねしていれば解除（削除）
        post.likes.remove(request.user)
        liked = False
    else:
        # まだならいいね（追加）
        post.likes.add(request.user)
        liked = True

    # JSON形式で結果を返す
    return JsonResponse({
        'liked': liked,           # Trueなら「いいね済」
        'count': post.likes.count() # 新しいいいね数
    })

# ▼▼▼ 投稿の編集と削除 ▼▼▼
@login_required
def post_edit(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # 本人チェック：他人の投稿なら一覧へ強制送還
    if post.user != request.user:
        return redirect('records:post_list')

    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save()
            return redirect('records:post_list')
    else:
        form = PostForm(instance=post)
    
    return render(request, 'records/post_edit.html', {'form': form, 'post': post})

@login_required
def post_delete(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    # 本人チェック
    if post.user != request.user:
        return redirect('records:post_list')
    
    if request.method == 'POST':
        post.delete()
        return redirect('records:post_list')
    
    return redirect('records:post_list')

@login_required
def record_detail_api(request, record_id):
    record = get_object_or_404(DailyRecord, pk=record_id, user=request.user)
    
    # モーダルの中身だけのテンプレートを使ってレンダリング
    return render(request, 'records/record_detail_content.html', {'record': record})

@login_required
def record_modal(request, date):
    record = get_object_or_404(DailyRecord, user=request.user, date=date)
    return render(request, 'records/record_detail_modal_content.html', {'record': record})

# ギャラリー機能
@login_required
def gallery(request):
    # 1. ログイン中のユーザーの記録を、日付の新しい順に取得
    records_qs = DailyRecord.objects.filter(user=request.user)

    # 最新、最古の日付を探す
    date_range = records_qs.aggregate(min_date=Min('date'), max_date=Max('date'))
    
    # 日付型を "YYYY-MM-DD" 文字列に変換する関数（inputタグ用）
    def format_date(d):
        return d.strftime('%Y-%m-%d') if d else ''

    default_start = format_date(date_range['min_date'])
    default_end   = format_date(date_range['max_date'])
    
    # URLのパラメータ(?start_date=...&end_date=...)を取得
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    # 2. フォームから送られた値を取得。なければデフォルト値（最古・最新）を採用
    # 「初回アクセス時（GETパラメータ自体がない時）」のみデフォルトを使う
    if 'start_date' in request.GET:
        start_date = request.GET.get('start_date')
    else:
        start_date = default_start

    if 'end_date' in request.GET:
        end_date = request.GET.get('end_date')
    else:
        end_date = default_end

    # 開始日が指定されていたら、それ「以上(__gte)」で絞り込み
    if start_date:
        records_qs = records_qs.filter(date__gte=start_date)

    # 終了日が指定されていたら、それ「以下(__lte)」で絞り込み
    if end_date:
        records_qs = records_qs.filter(date__lte=end_date)
    
    # 並び替え
    records_qs = records_qs.order_by('-date')

    # 体重比較
    period_summary = None
    
    # 記録が1つ以上ある場合のみ計算
    if records_qs.exists():
        # order_by('-date') なので、first()が最新、last()が最古
        latest_record = records_qs.first()
        oldest_record = records_qs.last()
        
        # 両方に体重が記録されている場合のみ計算
        if latest_record.weight is not None and oldest_record.weight is not None:
            diff = latest_record.weight - oldest_record.weight
            
            period_summary = {
                'start_weight': oldest_record.weight,
                'end_weight': latest_record.weight,
                'diff': round(abs(diff), 1), # 絶対値で扱う
                'is_decrease': diff < 0,     # 減ったかどうか判定
                'sign': '-' if diff < 0 else '+' if diff > 0 else '±'
            }

    # 2. JavaScriptに渡すためのリストを作成
    records_list = []
    for record in records_qs:
        # 写真が登録されている記録だけをピックアップ
        if record.photo:
            records_list.append({
                'date': record.date.strftime('%Y-%m-%d'),
                # 体重が未入力(None)の場合は 0 や ハイフン扱いにするなどの対策
                'weight': record.weight if record.weight is not None else 0,
                'image': record.photo.url
            })

    # 3. テンプレートに渡す
    context = {
        'records_json': records_list,
        'start_date_value': start_date or '', 
        'end_date_value': end_date or '',
        'period_summary': period_summary,
    }
    return render(request, 'records/gallery.html', context)
