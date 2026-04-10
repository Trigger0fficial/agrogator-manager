from django.shortcuts import render

def show_pricing_grid(req):
    return render(req, 'logistic/pricing_grid.html')



