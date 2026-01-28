from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.contrib.auth import login
from django.contrib import messages
from django.views.generic import CreateView
from django.views.decorators.http import require_POST
from django.urls import reverse_lazy
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count 

from .forms import CustomUserCreationForm, ProfileEditForm
from records.models import DailyRecord, Post
from missions.models import  MissionLog

import json

User = get_user_model()

# Create your views here.
def index(request):
    return render(request, 'index.html')

class SignUpView(CreateView):
    form_class = CustomUserCreationForm
    template_name = 'registration/signup.html'
    # 登録が成功したらホーム画面へ
    success_url = reverse_lazy('records:index')

    def form_valid(self, form):
        valid = super().form_valid(form)
        login(self.request, self.object)
        messages.success(self.request, 'SelFitへようこそ！登録ありがとうございます🎉')
        return valid


@login_required
def profile_detail(request, user_id=None): # 追加：プロフィール詳細画面
    # user_idが指定されていればその人を、なければ自分を表示（将来のSNS対応）
    if user_id:
        user = get_object_or_404(User, id=user_id)
    else:
        user = request.user

    # --- 統計データの計算 ---
    records = DailyRecord.objects.filter(user=user).order_by('date')
    
    # 1. 記録数
    total_records = records.count()
    
    # 2. 開始日とアプリ利用日数
    if user.date_joined:
        days_since_joined = (timezone.now() - user.date_joined).days + 1
    else:
        days_since_joined = 0

    # 3. 最初の体重（記録の中で一番古い日付のもの）
    first_record = records.first()
    initial_weight = first_record.weight if first_record else None

    # 4. 最新の体重
    last_record = records.filter(weight__isnull=False).last()
    current_weight = last_record.weight if last_record else None

    # 5. 変化量
    weight_diff = None
    if initial_weight and current_weight:
        weight_diff = round(current_weight - initial_weight, 1)

    # 6. ミッション達成日数
    perfect_mission_days = MissionLog.objects.filter(user=user)\
        .values('completed_at__date')\
        .annotate(count=Count('id'))\
        .filter(count__gte=3)\
        .count()
    
    # 7. ログインユーザーが、このプロフィール主をフォローしているか？
    is_following = request.user.following.filter(id=user.id).exists()
    
    # 8. フォロワー数とフォロー数
    follower_count = user.followers.count()
    following_count = user.following.count()

    # 9. 合計いいね数の計算
    total_likes = Post.objects.filter(user=user).aggregate(total=Count('likes'))['total']
    if total_likes is None:
        total_likes = 0

    # 10. 目標体重までの差分
    target_weight = user.target_weight
    to_target = None
    if current_weight is not None and target_weight is not None:
        to_target = round(current_weight - target_weight, 1)

    context = {
        'target_user': user, # テンプレート内では user がログインユーザーを指すため別名で
        'total_records': total_records,
        'days_since_joined': days_since_joined,
        'initial_weight': initial_weight,
        'current_weight': current_weight,
        'weight_diff': weight_diff,
        'perfect_mission_days': perfect_mission_days,
        'is_following': is_following,
        'follower_count': follower_count,
        'following_count': following_count,
        'total_likes': total_likes,
        'to_target': to_target,
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit(request): # プロフィール編集画面
    user = request.user
    if request.method == 'POST':
        form = ProfileEditForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            form.save()
            # プロフィール画面（自分のID）へリダイレクト
            return redirect('accounts:profile', user_id=user.id)
    else:
        form = ProfileEditForm(instance=user)
    
    return render(request, 'accounts/profile_edit.html', {'form': form})

@login_required
def follow_user(request, user_id): # フォロー 
    target_user = get_object_or_404(User, id=user_id)
    if target_user != request.user:
        request.user.following.add(target_user)
    return redirect('accounts:profile', user_id=user_id)

@login_required
def unfollow_user(request, user_id): # フォロー解除
    target_user = get_object_or_404(User, id=user_id)
    request.user.following.remove(target_user)
    return redirect('accounts:profile', user_id=user_id)


@login_required
def follow_list(request, user_id, type): # フォロー・フォロワー一覧表示 
    target_user = get_object_or_404(User, id=user_id)
    
    if type == 'following':
        title = f"{target_user.username}さんのフォロー中"
        users = target_user.following.all()
    else: # followers
        title = f"{target_user.username}さんのフォロワー"
        users = target_user.followers.all()

    return render(request, 'accounts/follow_list.html', {
        'target_user': target_user,
        'users': users,
        'title': title,
        'type': type
    })

@login_required
@require_POST
def update_privacy_api(request):
    """
    Ajaxでプライバシー設定のみを更新するAPI
    """
    try:
        data = json.loads(request.body)
        user = request.user
        
        # データの更新
        # JSから true/false が送られてくるのでそれをセット
        user.is_anonymous_account = data.get('is_anonymous_account', False)
        user.hide_profile_image = data.get('hide_profile_image', False)
        user.save()
        
        return JsonResponse({'status': 'success', 'message': '設定を保存しました'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)