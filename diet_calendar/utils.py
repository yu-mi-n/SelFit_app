from calendar import HTMLCalendar
from django.urls import reverse
from records.models import DailyRecord
from missions.models import MissionLog

# ... (import文は変更なし) ...

class DietCalendar(HTMLCalendar):
    # ... (__init__, formatmonth は変更なし) ...
    def __init__(self, year=None, month=None, user=None):
        self.year = year
        self.month = month
        self.user = user
        super(DietCalendar, self).__init__(firstweekday=6)
        self.cssclass_month = "calendar-table table"

    def formatmonth(self, theyear, themonth, withyear=True):
        v = []
        a = v.append
        a('<table class="%s">' % self.cssclass_month)
        a('\n')
        a(self.formatweekheader())
        a('\n')
        for week in self.monthdays2calendar(theyear, themonth):
            a(self.formatweek(week)) 
            a('\n')
        a('</table>')
        a('\n')
        return ''.join(v)

    def formatday(self, day, weekday):
        if day == 0:
            return '<td class="noday">&nbsp;</td>'

        # その日の記録を取得
        record_exists = DailyRecord.objects.filter(
            user=self.user, 
            date__year=self.year, 
            date__month=self.month, 
            date__day=day
        ).prefetch_related('conditions').first()

        # その日のミッション達成数を取得
        mission_count = MissionLog.objects.filter(
            user=self.user,
            completed_at__year=self.year,
            completed_at__month=self.month,
            completed_at__day=day
        ).count()

        # 詳細モーダル用のURLを準備
        detail_url = None
        mission_detail_url = None # ★追加: ミッション専用URL
        
        if record_exists:
            detail_url = reverse('records:record_detail_api', args=[record_exists.pk])
            mission_detail_url = reverse('diet_calendar:mission_detail', args=[record_exists.pk])

        # コンディションアイコン
        icons_html = ""
        if record_exists:
            conditions = record_exists.conditions.all()
            if conditions:
                for condition in conditions:
                    if condition.icon:
                        icons_html += f'<span class="ms-1">{condition.icon}</span>'

        # ヘッダー (日付 + アイコン)
        header_html = f'''
            <div class="d-flex justify-content-between align-items-start mb-2" style="min-height: 24px;">
                <span class="date-number">{day}</span>
                <div class="condition-icons small">{icons_html}</div>
            </div>
        '''
        
        content_html = '<div class="calendar-content">'
        
        # 1. 「記録済」バッジ (通常URLを使用)
        if record_exists and detail_url:
            content_html += (
                f'<a href="javascript:void(0);" '
                f'class="badge bg-success text-decoration-none mb-1 d-block mx-auto py-2 px-3 open-detail-modal" '
                f'style="width: 70%;" '
                f'data-url="{detail_url}">' # 通常の詳細URL
                f'📝 記録済</a>'
            )
        
        # 2. ミッション達成バッジ (Perfect / ★) ->  mission_detail_urlを使用
        if mission_count >= 3:
            if detail_url:
                content_html += (
                    f'<a href="javascript:void(0);" '
                    f'class="badge bg-warning text-dark border border-warning d-block mx-auto py-1 mt-1 px-3 open-detail-modal" '
                    f'style="width: 70%; cursor: pointer;" '
                    f'data-url="{mission_detail_url}">' # ★ミッション専用URL
                    f'👑 Perfect</a>'
                )
            else:
                content_html += (
                    f'<a href="javascript:void(0);" '
                    f'class="badge bg-warning text-dark border border-warning d-block mx-auto py-1 mt-1 px-3" '
                    f'style="width: 70%; cursor: pointer;" '
                    f'data-bs-template=\'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner" style="background: linear-gradient(180deg, #dc3545 0%, #ffffff 100%); color: #000;"></div></div>\' '
                    f'onclick="var t=bootstrap.Tooltip.getOrCreateInstance(this, {{title: \'記録がないため<br>表示できません\', html: true, trigger: \'manual\'}}); t.show(); setTimeout(() => t.hide(), 2000);">'
                    f'👑 Perfect</a>'
                )

        elif mission_count > 0:
            if detail_url:
                content_html += (
                    f'<a href="javascript:void(0);" '
                    f'class="small fw-bold mt-1 d-block text-decoration-none open-detail-modal" '
                    f'style="color: #f1c40f; text-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer;" '
                    f'data-url="{mission_detail_url}">' # ★修正: ミッション専用URL
                    f'★ {mission_count}</a>'
                )
            else:
                content_html += (
                    f'<a href="javascript:void(0);" '
                    f'class="small fw-bold mt-1 d-block text-decoration-none" '
                    f'style="color: #f1c40f; cursor: pointer;" '
                    f'data-bs-template=\'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner" style="background: linear-gradient(180deg, #dc3545 0%, #ffffff 100%); color: #000;"></div></div>\' '
                    f'onclick="var t=bootstrap.Tooltip.getOrCreateInstance(this, {{title: \'記録がないため<br>表示できません\', html: true, trigger: \'manual\'}}); t.show(); setTimeout(() => t.hide(), 2000);">'
                    f'★ {mission_count}</a>'
                )
            
        content_html += '</div>'

        return f'<td class="{self.cssclasses[weekday]} calendar-cell">{header_html}{content_html}</td>'