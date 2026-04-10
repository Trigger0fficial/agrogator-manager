import requests
import json
from django.shortcuts import render, redirect
from django.core.cache import cache
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from .forms import LoginForm
from .config import (
    ACCESS_TOKEN_CACHE_KEY,
    REFRESH_TOKEN_CACHE_KEY,
    USER_ROLE_CACHE_KEY,
    USER_INFO_CACHE_KEY
)

@csrf_exempt
def login_user(request):
    """
    Отображение страницы входа и обработка редиректов
    """
    print("=== login_user called ===")
    print(f"Request method: {request.method}")
    print(f"Request path: {request.path}")
    
    if request.method == 'GET':
        print("GET request - showing login form")
        
        # Если пользователь уже авторизован, перенаправляем на главную
        if cache.get(ACCESS_TOKEN_CACHE_KEY):
            print("User already authenticated, redirecting to main")
            return redirect('main')
        
        form = LoginForm()
        return render(request, 'account/login.html', {'form': form})
    
    # POST запросы обрабатываются через JavaScript
    print("POST request - should be handled by JavaScript")
    return render(request, 'account/login.html', {'form': LoginForm()})

def get_user_data_and_redirect(request, access_token):
    """
    Получение данных пользователя и проверка роли
    """
    try:
        # Запрос данных пользователя
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f"{API_BASE_URL}{USER_ME_URL}",
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code == 200:
            # Успешное получение данных пользователя
            user_data = response.json()
            
            # Проверяем роль пользователя
            profile_roles = user_data.get('profileRoles', {})
            role_name = profile_roles.get('name', '').lower()
            
            if role_name in ALLOWED_ROLES:
                # Сохраняем роль в кеш
                cache.set(USER_ROLE_CACHE_KEY, role_name, timeout=3600)
                
                # Дополнительные данные пользователя (опционально)
                user_info = {
                    'id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'phone': user_data.get('phone'),
                    'role': role_name,
                    'verification_status': user_data.get('verificationStatus', {}).get('name'),
                    'is_verified': user_data.get('isVerified', False)
                }
                cache.set(USER_INFO_CACHE_KEY, user_info, timeout=3600)
                
                # Перенаправляем на главную страницу
                messages.success(request, f'Добро пожаловать, {user_data.get("email")}!')
                return redirect('main')
            else:
                # Роль не допущена
                cache.delete(ACCESS_TOKEN_CACHE_KEY)
                cache.delete(REFRESH_TOKEN_CACHE_KEY)
                cache.delete(USER_INFO_CACHE_KEY)
                messages.error(request, f'Доступ запрещен. Ваша роль: {role_name}')
                return render(request, 'account/login.html', {'form': LoginForm()})
                
        else:
            # Ошибка получения данных пользователя
            cache.delete(ACCESS_TOKEN_CACHE_KEY)
            cache.delete(REFRESH_TOKEN_CACHE_KEY)
            cache.delete(USER_INFO_CACHE_KEY)
            messages.error(request, 'Ошибка получения данных пользователя. Пожалуйста, авторизуйтесь снова.')
            return render(request, 'account/login.html', {'form': LoginForm()})
            
    except requests.exceptions.Timeout:
        cache.delete(ACCESS_TOKEN_CACHE_KEY)
        cache.delete(REFRESH_TOKEN_CACHE_KEY)
        cache.delete(USER_INFO_CACHE_KEY)
        messages.error(request, 'Превышено время ожидания. Попробуйте позже.')
        return render(request, 'account/login.html', {'form': LoginForm()})
        
    except requests.exceptions.RequestException:
        cache.delete(ACCESS_TOKEN_CACHE_KEY)
        cache.delete(REFRESH_TOKEN_CACHE_KEY)
        cache.delete(USER_INFO_CACHE_KEY)
        messages.error(request, 'Ошибка соединения с сервером')
        return render(request, 'account/login.html', {'form': LoginForm()})
        
    except Exception as e:
        cache.delete(ACCESS_TOKEN_CACHE_KEY)
        cache.delete(REFRESH_TOKEN_CACHE_KEY)
        cache.delete(USER_INFO_CACHE_KEY)
        messages.error(request, 'Произошла ошибка при проверке данных пользователя')
        return render(request, 'account/login.html', {'form': LoginForm()})

def logout_user(request):
    """
    Выход пользователя
    """
    # Удаляем все данные из кеша
    cache.delete(ACCESS_TOKEN_CACHE_KEY)
    cache.delete(REFRESH_TOKEN_CACHE_KEY)
    cache.delete(USER_ROLE_CACHE_KEY)
    cache.delete(USER_INFO_CACHE_KEY)
    
    messages.info(request, 'Вы успешно вышли из системы')
    return redirect('account:login')


def register_manager(req):
    return render(req, 'account/register_manager.html')

