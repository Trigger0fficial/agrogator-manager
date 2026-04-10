from django.urls import path
from zope.interface import named

from .views import *

urlpatterns = [
    path('pricing_grid', show_pricing_grid, name='pricing_grid')
]

