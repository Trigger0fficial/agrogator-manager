from django.urls import path
from django.conf.urls.static import static
from django.conf import settings

from .views import *

app_name = 'account'

urlpatterns = [
    path('', login_user, name='login'),  # GET и POST на одном URL
    path('logout/', logout_user, name='logout'),  # Выход из системы
    path('register_manager/', register_manager, name='register_manager')
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)