from django.urls import path
from django.conf.urls.static import static
from django.conf import settings

from .views import *

print("=== main/urls.py loaded ===")

urlpatterns = [
    path('', show_main, name='main'),
    # Другие URL для main приложения
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

print("=== main urlpatterns created ===")
print("URLpatterns:", urlpatterns)