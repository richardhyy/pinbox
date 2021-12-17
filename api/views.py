import json
import os
import re
import uuid
from itertools import chain

from django.contrib.gis.geos import GEOSException
from django.contrib.humanize.templatetags import humanize
import django.contrib.gis.geos as geos
from django.core.serializers import serialize
from django.db.models import Q, QuerySet
from django.shortcuts import render
from django.shortcuts import reverse
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.datetime_safe import datetime

from django.views import generic
from django.http import HttpResponse, FileResponse
from django.http import JsonResponse

from django.forms.models import model_to_dict

import api.models as models


# Map related APIs

def get_private_maps(request):
    """
    Check authentication and return all maps owned by the user as JSON
    :param request:
    :return:
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    maps = models.Map.objects.filter(owner=request.user).order_by("-last_viewed")
    response = []

    for _map in maps:
        response.append(_map.to_abstract_dict())

    return JsonResponse({
        'maps': response
    }, status=200)


def get_shared_maps(request):
    """
    Check authentication and return all shared maps (i.e. the user is included in the collaborators list) as JSON
    :param request:
    :return:
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    # Get all maps that the user is a collaborator of but not the owner
    maps = models.Map.objects.filter(~Q(owner=request.user), Q(collaborators=request.user)).order_by("-last_viewed")
    response = []

    for _map in maps:
        response.append(_map.to_abstract_dict())

    return JsonResponse({
        'maps': response
    }, status=200)


def get_public_maps(request):
    """
    Return all public maps as JSON
    :param request:
    :return:
    """
    maps = models.Map.objects.filter(public=True)
    # Sort by star_count descending
    maps = sorted(maps, key=lambda x: x.star_count, reverse=True)
    response = []

    for _map in maps:
        response.append(_map.to_abstract_dict())

    return JsonResponse({
        'maps': response
    }, status=200)


def get_map_detail(request, map_id):
    """
    Check authentication and return requested map as JSON
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    map.last_viewed = timezone.now()
    map.save()

    return JsonResponse(map.to_detailed_dict(), status=200)


def create_map(request):
    """
    Check authentication and create a new map
    :param request:
    :return:
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

    name = request.POST.get('name', None)
    if not name:
        name = get_default_name("New Map")

    description = request.POST.get('description', None)

    map = models.Map(
        owner=request.user,
        name=name,
        description=description,
    )
    map.save()

    # return url to the new map
    return JsonResponse({
        'url': reverse('interface:map', args=[map.id])
    }, status=200)


def update_map(request, map_id):
    """
    Check authentication and update the map
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_delete(request.user):
        return JsonResponse({'error': 'You are not allowed to update the information of this map'}, status=403)

    name = request.POST.get('name', None)
    description = request.POST.get('description', None)
    collaborators = request.POST.getlist('collaborators[]', None)
    public = request.POST.get('public', None)
    base_map = request.POST.get('base_map', None)

    if name:
        map.name = name
    if description:
        map.description = description
    if collaborators:
        map.collaborators.set(models.User.objects.filter(username__in=collaborators))
    if public:
        map.public = public == 'true'
    if base_map:
        try:
            _requested_base_map = models.BaseMap.objects.get(id=base_map)
        except models.Map.DoesNotExist:
            return JsonResponse({'error': 'Base map does not exist'}, status=400)
        map.base_map = _requested_base_map

    map.save()

    return JsonResponse({'status': 'ok'}, status=200)


def delete_map(request, map_id):
    """
    Check authentication and delete a map
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if map.can_delete(request.user):
        map.delete()
        return JsonResponse({'status': 'ok'}, status=200)
    else:
        return JsonResponse({'error': 'You are not allowed to delete this map'}, status=403)


def get_map_share_link(request, map_id):
    """
    Return the share link of the map
    :param request:
    :param map_id:
    :return:
    """
    # Generate share link regardless of whether the map is public or not
    return JsonResponse({'share_link': reverse('interface:map', kwargs={'map_id': map_id})}, status=200)


# MARK: - Base map related APIs

def get_base_maps(request):
    """
    Get all base maps
    :param request:
    :return:
    """
    base_maps = models.BaseMap.objects.all()

    return JsonResponse({'base_maps': [base_map.to_dict() for base_map in base_maps]}, status=200)


# MARK: - Entity related APIs

def create_point(request, map_id):
    """
    Check authentication and add a point to the map
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to add points to this map'}, status=403)

    name = request.POST.get('name', get_default_name('Point'))
    try:
        longitude = float(request.POST.get('longitude', None))
        latitude = float(request.POST.get('latitude', None))

        if not check_lon_lat(longitude, latitude):
            return JsonResponse({'error': 'Invalid longitude or latitude'}, status=400)

    except TypeError:
        return JsonResponse({'error': 'Invalid longitude or latitude'}, status=400)

    point = models.Point(
        name=name,
        created_by=request.user,
        geom=geos.Point(longitude, latitude),
    )
    point.save()

    map.points.add(point)
    map.save()

    return JsonResponse({'status': 'ok', 'geom': feature_to_geojson(point)}, status=200)


def update_point(request, map_id, point_id):
    """
    Update a point
    :param request:
    :param map_id:
    :param point_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to add points to this map'}, status=403)

    # The point must be in the map
    try:
        point = map.points.get(id=point_id)
    except models.Point.DoesNotExist:
        return JsonResponse({'error': 'Point not found'}, status=404)

    name = request.POST.get('name', None)
    description = request.POST.get('description', None)
    longitude = request.POST.get('longitude', None)
    latitude = request.POST.get('latitude', None)

    if name:
        point.name = name
    if description:
        point.description = description
    if longitude and latitude:
        try:
            longitude = float(longitude)
            latitude = float(latitude)
        except TypeError:
            return JsonResponse({'error': 'Invalid longitude or latitude'}, status=400)

        if check_lon_lat(longitude, latitude):
            point.geom = geos.Point(longitude, latitude)
        else:
            return JsonResponse({'error': 'Invalid longitude or latitude'}, status=400)

    point.save()

    return JsonResponse({'status': 'ok'}, status=200)


def delete_point(request, map_id, point_id):
    """
    Check authentication and delete a point from the map
    :param request:
    :param map_id:
    :param point_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to delete points from this map'}, status=403)

    # Check if point exists
    try:
        point = map.points.get(id=point_id)
    except models.Point.DoesNotExist:
        return JsonResponse({'error': 'Point not found'}, status=404)

    map.points.remove(point)
    map.save()

    point.delete()

    return JsonResponse({'status': 'ok'}, status=200)


def create_line(request, map_id):
    """
    Check authentication and add a line to the map
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to add lines to this map'}, status=403)

    name = request.POST.get('name', get_default_name('Line'))
    linestring_wkt = request.POST.get('linestring', None)
    if not linestring_wkt:
        return JsonResponse({'error': 'LineString WKT is required'}, status=400)

    try:
        linestring = geos.fromstr(linestring_wkt)
    except (GEOSException, ValueError):
        return JsonResponse({'error': 'Invalid linestring: failed parsing WKT'}, status=400)

    if not linestring.geom_type == 'LineString':
        return JsonResponse({'error': 'Invalid linestring'}, status=400)

    line = models.LineString(
        name=name,
        created_by=request.user,
        geom=linestring,
    )
    line.save()

    map.polylines.add(line)
    map.save()

    return JsonResponse({'status': 'ok', 'geom': feature_to_geojson(line)}, status=200)


def update_line(request, map_id, line_id):
    """
    Update a line
    :param request:
    :param map_id:
    :param line_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to update lines in this map'}, status=403)

    # The line must be in the map
    try:
        line = map.polylines.get(id=line_id)
    except models.LineString.DoesNotExist:
        return JsonResponse({'error': 'Line not found'}, status=404)

    name = request.POST.get('name', None)
    description = request.POST.get('description', None)
    linestring_wkt = request.POST.get('linestring', None)

    if name:
        line.name = name
    if description:
        line.description = description
    if linestring_wkt:
        try:
            linestring = geos.fromstr(linestring_wkt)
        except (GEOSException, ValueError):
            return JsonResponse({'error': 'Invalid linestring: failed parsing WKT'}, status=400)

        if not linestring.geom_type == 'LineString':
            return JsonResponse({'error': 'Invalid linestring'}, status=400)

        line.geom = linestring

    line.save()

    return JsonResponse({'status': 'ok'}, status=200)


def delete_line(request, map_id, line_id):
    """
    Check authentication and delete a line from the map
    :param request:
    :param map_id:
    :param line_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_edit(request.user):
        return JsonResponse({'error': 'You are not allowed to delete lines from this map'}, status=403)

    try:
        line = map.polylines.get(id=line_id)
    except models.LineString.DoesNotExist:
        return JsonResponse({'error': 'Line not found'}, status=404)

    map.polylines.remove(line)
    map.save()

    line.delete()

    return JsonResponse({'status': 'ok'}, status=200)


def filter_features(request, map_id):
    """
    Filter features in a map
    :param request:
    :param map_id:
    :return:
    """
    try:
        page = int(request.GET.get('page', -1))
        per_page = int(request.GET.get('limit', -1))
    except TypeError:
        return JsonResponse({'error': 'Invalid pagination parameters'}, status=400)

    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    keyword = request.GET.get('keyword', None)

    if keyword:
        points = map.points.filter(name__icontains=keyword)
        lines = map.polylines.filter(name__icontains=keyword)
    else:
        points = map.points.all()
        lines = map.polylines.all()

    total = points.count() + lines.count()
    # Add points and lines to a feature collection then sort by create_at
    features = sorted(
        chain(
            points,
            lines,
        ),
        key=lambda feature: feature.created_at,
        reverse=True,
    )

    if page >= 0 and per_page > 0:
        features = features[(page - 1) * per_page:page * per_page]

    return JsonResponse({
        'total': total,
        'geom': feature_to_geojson(features, True),
    }, status=200)


# MARK: - Collaboration APIs

def add_collaborator(request, map_id):
    """
    Add a collaborator to a map
    :param request:
    :param map_id:
    :return:
    """
    username = request.POST.get('username', None)
    if not username:
        return JsonResponse({'error': 'Username is required'}, status=400)

    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_delete(request.user):
        return JsonResponse({'error': 'You are not allowed to add collaborators to this map'}, status=403)

    # Target user should not be the owner of the map
    if map.owner.username == username:
        return JsonResponse({'error': 'You cannot add yourself as a collaborator'}, status=400)

    try:
        user = models.User.objects.get(username=username)
    except models.User.DoesNotExist:
        return JsonResponse({'error': 'User does not exist'}, status=404)

    if user in map.collaborators.all():
        return JsonResponse({'error': 'User is already a collaborator'}, status=400)

    map.collaborators.add(user)
    map.save()

    return JsonResponse({'status': 'ok'}, status=200)


def remove_collaborator(request, map_id):
    """
    Remove a collaborator from a map
    :param request:
    :param map_id:
    :return:
    """
    id = request.POST.get('id', None)
    if not id:
        return JsonResponse({'error': 'ID is required'}, status=400)

    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    if not map.can_delete(request.user):
        return JsonResponse({'error': 'You are not allowed to remove collaborators from this map'}, status=403)

    try:
        user = models.User.objects.get(id=id)
    except models.User.DoesNotExist:
        return JsonResponse({'error': 'User does not exist'}, status=404)

    if user not in map.collaborators.all():
        return JsonResponse({'error': 'User is not a collaborator'}, status=400)

    map.collaborators.remove(user)
    map.save()

    return JsonResponse({'status': 'ok'}, status=200)


def get_collaborators(request, map_id):
    """
    Get collaborators of a map
    :param request:
    :param map_id:
    :return:
    """
    try:
        map = get_map_if_authenticated(request.user, map_id)
    except AccessError as e:
        return JsonResponse({'error': e.message}, status=e.status_code)

    return JsonResponse({
        'collaborators': [{'id': collaborator.id, 'username': collaborator.username} for collaborator in map.collaborators.all()]
    }, status=200)


# MARK: - Generic helper functions

def get_default_name(base_name):
    return base_name + ' - ' + str(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


# MARK: - Geography helper functions

def check_lon_lat(lon, lat):
    """
    Check if a longitude and latitude are valid
    :param lon:
    :param lat:
    :return:
    """
    if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
        return False
    return True


def feature_to_geojson(feature, param_as_list=False):
    """
    Convert a feature to a geojson object
    :param feature:
    :return:
    """
    return serialize('geojson', feature if type(feature) == QuerySet or param_as_list else [feature],
                     geometry_field='geom', fields=models.GEOJSON_PROPERTY_FIELDS)


# MARK: - Authentication related helper functions

def get_map_if_authenticated(user, map_id):
    """
    Check if the user is authenticated and if the user can view the map.
    Return requested map if the user is authenticated and owns the map.
    Throw an error if the user is not authenticated or if the user does not own the map.
    :param user: incoming request.user
    :param map_id: can be an ID or a shared_link token
    :return:
    """

    # The visitor doesn't have to be logged in to view a map
    # if not user.is_authenticated:
    #     raise AccessError('Not authenticated', 401)

    try:
        map = models.Map.objects.get(id=map_id)
    except models.Map.DoesNotExist:
        raise AccessError('Map does not exist', 404)

    if not map.can_view(user):
        raise AccessError('Not authorized', 403)

    return map


class AccessError(Exception):
    """
    Custom exception class for authentication errors
    """

    def __init__(self, message, status_code):
        self.message = message
        self.status_code = status_code
