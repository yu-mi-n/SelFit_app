from django.shortcuts import render, redirect, get_object_or_404
from .models import Mission, MissionLog
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
import random
from .consts import MISSION_LIST, EXP_SETTINGS, MISSION_REWARDS

@login_required
def mission_complete(request, mission_id):
    mission = get_object_or_404(Mission, id=mission_id)
    today = timezone.now().date()

    # 既に達成済みチェック
    if MissionLog.objects.filter(user=request.user, mission=mission, completed_at__date=today).exists():
        return redirect('records:index')

    if request.method == 'POST':
        # 1. ログを作成
        MissionLog.objects.create(
            user=request.user,
            mission=mission,
            comment=request.POST.get('comment', '')
        )
        
        # 2. ★追加: 経験値付与ロジック
        exp_gain = 0
        if mission.difficulty == 1:
            exp_gain = MISSION_REWARDS['MISSION_LV1']
        elif mission.difficulty == 2:
            exp_gain = MISSION_REWARDS['MISSION_LV2']
        elif mission.difficulty == 3:
            exp_gain = MISSION_REWARDS['MISSION_LV3']
        
        is_level_up = request.user.add_exp(exp_gain)
        if is_level_up:
            messages.success(request, 'Level Up!', extra_tags='level_up_event')
        
        # 3. 3つ達成チェック (既存ロジック)
        completed_count = MissionLog.objects.filter(
            user=request.user, 
            completed_at__date=today
        ).count()

        if completed_count >= 3:
            return redirect('/records/post/create/?initial_text=今日のミッションを3つ全て達成しました！💯✨ #SelFit #ミッションコンプリート')

        return redirect('records:index')
    
    return render(request, 'missions/complete.html', {'mission': mission})

def get_daily_missions():
    """ 難易度1, 2, 3からそれぞれ1つずつランダムに選出する """
    # 難易度ごとにリストを分ける
    lv1_missions = [m for m in MISSION_LIST if m[1] == 1]
    lv2_missions = [m for m in MISSION_LIST if m[1] == 2]
    lv3_missions = [m for m in MISSION_LIST if m[1] == 3]

    daily_missions = []
    
    if lv1_missions: daily_missions.append(random.choice(lv1_missions))
    if lv2_missions: daily_missions.append(random.choice(lv2_missions))
    if lv3_missions: daily_missions.append(random.choice(lv3_missions))
    
    return daily_missions