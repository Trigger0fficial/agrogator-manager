from django.shortcuts import render
from django.http import HttpResponse

def show_list_verification(req):
    print("Verification view called!")
    print(f"Request path: {req.path}")
    try:
        response = render(req, 'verification/list_verification.html')
        print("Template rendered successfully")
        return response
    except Exception as e:
        print(f"Error rendering template: {e}")
        return HttpResponse(f"Error: {e}", status=500)

def show_verification_detail(req, user_id):
    print(f"Verification detail view called for user_id: {user_id}")
    print(f"Request path: {req.path}")
    try:
        # Передаем user_id в контекст шаблона для использования в JavaScript
        response = render(req, 'verification/verification.html', {'user_id': user_id})
        print("Detail template rendered successfully")
        return response
    except Exception as e:
        print(f"Error rendering detail template: {e}")
        return HttpResponse(f"Error: {e}", status=500)


def show_list_quality(req):
    return render(req, 'verification/list_quality_check.html')

def show_quality_detail(req, culture_id):
    print(f"Quality detail view called for culture_id: {culture_id}")
    print(f"Request path: {req.path}")
    try:
        # Передаем culture_id в контекст шаблона для использования в JavaScript
        response = render(req, 'verification/quality.html', {'culture_id': culture_id})
        print("Quality detail template rendered successfully")
        return response
    except Exception as e:
        print(f"Error rendering quality detail template: {e}")
        return HttpResponse(f"Error: {e}", status=500)
