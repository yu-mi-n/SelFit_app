from django.contrib import admin
from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('accounts.urls')),
    path('records/', include('records.urls')),
    path('missions/', include('missions.urls')),
    path('calendar/', include('diet_calendar.urls')),
]

# 開発環境(DEBUG=True)での静的ファイル・メディアファイルの配信設定
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) # ここを追加しました