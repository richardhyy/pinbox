from django.shortcuts import redirect
from django.urls import path, include

from . import views
import django.contrib.auth.urls as auth_urls

app_name = 'interface'
urlpatterns = [
    path('', views.index, name='public_maps'),
    path('my/', views.editable_maps_request, name='editable_maps'),
    path('map/<int:map_id>', views.map_request, name='map'),

    path('login/', auth_urls.views.LoginView.as_view(), name='login'),
    path('register/', views.register_request, name='register'),
    path('logout/', views.logout_request, name='logout'),
]
