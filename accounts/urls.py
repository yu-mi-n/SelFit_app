from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from . import views

app_name = 'accounts'

urlpatterns = [
  path('', views.index, name='index'),
  path('login/', LoginView.as_view(), name='login'),
  path('logout/', LogoutView.as_view(), name='logout'),
  path('signup/', views.SignUpView.as_view(), name='signup'),

  path('profile/<int:user_id>/', views.profile_detail, name='profile'),
  path('profile/edit/', views.profile_edit, name='profile_edit'),

  path('follow/<int:user_id>/', views.follow_user, name='follow'),
  path('unfollow/<int:user_id>/', views.unfollow_user, name='unfollow'),
  path('profile/<int:user_id>/list/<str:type>/', views.follow_list, name='follow_list'),

  path('api/update_privacy/', views.update_privacy_api, name='update_privacy_api'),

]