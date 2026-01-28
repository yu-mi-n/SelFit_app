from django.urls import path
from . import views

app_name = 'records' 

urlpatterns = [
  path('', views.index, name='index'),

  path('add/', views.record_add, name='add'),
  path('edit/<int:pk>/', views.record_edit, name='edit'),
  path('delete/<int:pk>/', views.record_delete, name='delete'),

  path('<int:record_id>/meal/add/', views.add_meal, name='add_meal'),
  path('meal/<int:meal_id>/edit/', views.meal_edit, name='meal_edit'),
  path('meal/<int:meal_id>/delete/', views.meal_delete, name='meal_delete'),

  path('post/create/', views.post_create, name='post_create'),
  path('posts/', views.post_list, name='post_list'),
  path('post/edit/<int:post_id>/', views.post_edit, name='post_edit'),
  path('post/delete/<int:post_id>/', views.post_delete, name='post_delete'),
  path('post/like/<int:post_id>/', views.like_post, name='like_post'),

  path('api/detail/<int:record_id>/', views.record_detail_api, name='record_detail_api'),
  path('modal/<str:date>/', views.record_modal, name='record_modal'),

  path('gallery/', views.gallery, name='gallery'),
]