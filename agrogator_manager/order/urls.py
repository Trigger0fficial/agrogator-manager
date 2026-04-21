from django.urls import path
from django.conf.urls.static import static
from django.conf import settings

from . import views

urlpatterns = [
    path('deal/<str:deal_id>/', views.deal_detail, name='deal_detail'),
    path('lot/<str:lot_id>/', views.lot_detail, name='lot_detail'),
    path('request/<str:request_id>/', views.request_detail, name='request_detail'),
    path('my-deals/', views.my_deals, name='my_deals'),
    path('my-lots/', views.my_lots, name='my_lots'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
