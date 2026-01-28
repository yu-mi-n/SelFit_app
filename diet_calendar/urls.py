from django.urls import path
from . import views

app_name = 'diet_calendar'

urlpatterns = [
    path('', views.calendar_view, name='index'), # /calendar/ でアクセス
    path('<int:year>/<int:month>/', views.calendar_view, name='month'),
    path('missions/<int:pk>/', views.mission_detail, name='mission_detail'),
]