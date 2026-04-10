from django.urls import path
from . import views

app_name = 'logistics'

urlpatterns = [
    path('tariff-grid/', views.tariff_grid, name='tariff_grid'),
]
