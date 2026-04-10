from django.urls import path

from .views import *

app_name = 'verification'

urlpatterns = [
    path('list/', show_list_verification, name='list_verification'),
    path('detail/user/<uuid:user_id>/', show_verification_detail, name='verification_detail'),
    path('list_quality/', show_list_quality, name='list_quality'),
    path('detail/quality/<uuid:culture_id>/', show_quality_detail, name='quality_detail'),
    # Другие URL для verification приложения
]

