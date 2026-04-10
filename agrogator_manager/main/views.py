from django.shortcuts import render, redirect
from django.contrib import messages
import logging

logger = logging.getLogger(__name__)

def show_main(req):
    """
    Главная страница с проверкой авторизации и роли
    """
    logger.info(f"show_main called with method: {req.method}, path: {req.path}")
    print(f"=== show_main called ===")
    print(f"Method: {req.method}")
    print(f"Path: {req.path}")
    print(f"========================")
    
    # Проверяем наличие параметров авторизации в localStorage через JavaScript
    # Это будет проверяться на клиентской стороне в шаблоне
    
    # Получаем роль пользователя (будет передано из JavaScript)
    user_role = None  # В реальности будет получено из JavaScript
    
    # Определяем, показывать ли административную плашку
    show_admin_panel = False  # По умолчанию скрыто для manager
    
    context = {
        'show_admin_panel': show_admin_panel,
        'user_role': user_role
    }
    
    return render(req, 'main/index.html', context)
