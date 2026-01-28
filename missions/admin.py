from django.contrib import admin
from .models import Mission, MissionLog

class MissionAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'description']
    list_filter = ['difficulty']

class MissionLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'mission', 'completed_at']
    list_filter = ['user']

admin.site.register(Mission, MissionAdmin)
admin.site.register(MissionLog, MissionLogAdmin)