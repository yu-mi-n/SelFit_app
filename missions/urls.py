from django.urls import path
from . import views

app_name = 'missions'

urlpatterns = [
  path('<int:mission_id>/complete/', views.mission_complete, name='complete'),
]