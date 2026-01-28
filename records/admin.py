from django.contrib import admin
from .models import DailyRecord, ConditionTag

# タグ管理
class ConditionTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon']

# 記録管理
class DailyRecordAdmin(admin.ModelAdmin):
    list_display = ['date', 'user', 'weight', 'get_conditions_str']
    list_filter = ['user', 'date'] # 右側に絞り込みフィルターを表示

    def get_conditions_str(self, obj):
        return ", ".join([tag.name for tag in obj.conditions.all()])
    get_conditions_str.short_description = 'コンディション'

admin.site.register(DailyRecord, DailyRecordAdmin)
admin.site.register(ConditionTag, ConditionTagAdmin)