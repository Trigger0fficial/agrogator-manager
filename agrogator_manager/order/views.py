from django.shortcuts import render


def deal_detail(request, deal_id):
    """Детальная страница сделки по id (данные подгружаются по API на фронте)."""
    return render(request, 'order/deal_detail.html', {'deal_id': deal_id})

def my_deals(request):
    """Страница 'Мои сделки'."""
    return render(request, 'order/my_deals.html')

def my_lots(request):
    """Страница 'Мои лоты'."""
    return render(request, 'order/my_lots.html')

def lot_detail(request, lot_id):
    """Детальная страница лота по id (данные подгружаются по API на фронте)."""
    return render(request, 'order/lot_detail.html', {'lot_id': lot_id})


def request_detail(request, request_id):
    """Детальная страница заявки лота по id (данные подгружаются по API на фронте)."""
    return render(request, 'order/request_detail.html', {'request_id': request_id})
