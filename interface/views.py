from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.shortcuts import render
from django.shortcuts import reverse
from django.shortcuts import redirect

from django.views import generic
from django.http import HttpResponse
from django.http import JsonResponse


def index(request):
    return render(request, 'interface/map_list_public.html')


def editable_maps_request(request):
    """
    View function for map list page.
    If the user has not logged in, redirect to login page.
    :param request:
    :return:
    """
    if request.user.is_authenticated:
        return render(request, 'interface/map_list_editable.html', {
            'user': request.user
        })
    else:
        return redirect(reverse('interface:login'))


def map_request(request, map_id):
    """
    View function for map page.
    If the user has not logged in, redirect to login page.
    :param request:
    :param map_id:
    :return:
    """
    if request.user.is_authenticated:
        return render(request, 'interface/map.html', {
            'page_title': 'Map - PinBox',
            'user': request.user,
            'map_id': map_id
        })
    else:
        return redirect(reverse('interface:login'))


def register_request(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': 'success', 'next': reverse('interface:login')})
        else:
            return JsonResponse({'error': form.errors})
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {
        'form': form
    })


def logout_request(request):
    logout(request)
    return redirect(reverse('interface:login'))
