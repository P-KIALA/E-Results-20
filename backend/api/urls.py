from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="api-login"),
    path("register/", views.RegisterView.as_view(), name="api-register"),
    path("me/", views.MeView.as_view(), name="api-me"),
]
