from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Register your models here.

class CustomUserAdmin(UserAdmin):
  model = CustomUser
  list_display = ['username', 'email', 'target_weight', 'is_staff']

  fieldsets = UserAdmin.fieldsets + (
        ('追加情報', {'fields': ('target_weight',)}),
    )
  
admin.site.register(CustomUser, CustomUserAdmin)