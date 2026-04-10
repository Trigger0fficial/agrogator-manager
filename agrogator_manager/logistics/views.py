from django.shortcuts import render
from django.http import HttpResponse
import logging

logger = logging.getLogger(__name__)

def tariff_grid(request):
    """
    Отображение страницы тарификационной сетки
    """
    try:
        logger.info("Tariff grid view called")
        
        # Рендерим шаблон
        response = render(request, 'logistics/tariff_grid.html')
        logger.info("Tariff grid template rendered successfully")
        return response
        
    except Exception as e:
        logger.error(f"Error rendering tariff grid template: {e}")
        return HttpResponse(f"Error: {e}", status=500)
