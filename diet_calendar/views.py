from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.safestring import mark_safe
import datetime
from .utils import DietCalendar
from records.models import DailyRecord

@login_required
def calendar_view(request, year=None, month=None):
    # 年月の指定がなければ今月を表示
    if year is None or month is None:
        today = datetime.date.today()
        year = today.year
        month = today.month
    else:
        try:
            year = int(year)
            month = int(month)
        except ValueError:
            today = datetime.date.today()
            year = today.year
            month = today.month

    # 前月・次月の計算ロジック
    first_day = datetime.date(year, month, 1)
    prev_month_date = first_day - datetime.timedelta(days=1)
    # 次月計算（32日後を出して1日にリセット）
    next_month_date = (first_day + datetime.timedelta(days=32)).replace(day=1)

    # カレンダー生成
    cal = DietCalendar(year, month, user=request.user)
    html_cal = cal.formatmonth(year, month)

    context = {
        'calendar': mark_safe(html_cal),
        'current_year': year,
        'current_month': month,
        'prev_year': prev_month_date.year,
        'prev_month': prev_month_date.month,
        'next_year': next_month_date.year,
        'next_month': next_month_date.month,
    }
    return render(request, 'diet_calendar/calendar.html', context)

@login_required
def mission_detail(request, pk):
    """
    カレンダーのミッションアイコンから呼ばれる、ミッション詳細モーダル
    """
    record = get_object_or_404(DailyRecord, pk=pk, user=request.user)
    return render(request, 'diet_calendar/mission_detail_modal.html', {'record': record})