from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# Create your views here.

@csrf_exempt
@require_http_methods(["PATCH"])
def send_to_reject(request):
    """Отправка полного отказа"""
    try:
        data = json.loads(request.body)
        profile_id = data.get('profile')
        
        if not profile_id:
            return JsonResponse({
                'error': 'Profile ID is required'
            }, status=400)
        
        # Здесь логика для полного отказа
        # Пока просто возвращаем успех
        
        return JsonResponse({
            'success': True,
            'message': 'Rejection sent successfully'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["PATCH"])
def send_to_revision(request):
    """Отправка на доработку"""
    try:
        data = json.loads(request.body)
        profile_id = data.get('profile')
        
        if not profile_id:
            return JsonResponse({
                'error': 'Profile ID is required'
            }, status=400)
        
        # Здесь логика для отправки на доработку
        # Пока просто возвращаем успех
        
        return JsonResponse({
            'success': True,
            'message': 'Revision request sent successfully'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)
