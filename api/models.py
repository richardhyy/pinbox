import hashlib
import uuid

from django.contrib.humanize.templatetags import humanize
from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.db.models import Q
from django.forms import model_to_dict
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.serializers import serialize


# Collaborative Editing Models

class Cursor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    map = models.ForeignKey('Map', on_delete=models.CASCADE)
    longitude = models.FloatField()
    latitude = models.FloatField()
    timestamp = models.DateTimeField(default=timezone.now)

    @property
    def is_expired(self):
        return timezone.now() - self.timestamp > timezone.timedelta(seconds=60)

    def __str__(self):
        return '{} {} ({}, {})'.format(self.user, self.map, self.longitude, self.latitude)


class EditSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    last_active_at = models.DateTimeField(default=timezone.now)

    @property
    def is_expired(self):
        return timezone.now() - self.last_active_at > timezone.timedelta(minutes=5)

    def __str__(self):
        return self.user.username + " (" + str(self.created_at) + ")"


# Map styles

class BaseMap(models.Model):
    name = models.TextField(max_length=100)
    url = models.TextField(max_length=255)
    max_zoom = models.IntegerField(blank=True, null=True)
    attribution = models.TextField(max_length=255)

    def to_dict(self):
        return model_to_dict(self)

    def __str__(self):
        return self.name + " (" + self.url + ")"


# Geographical Models

GEOJSON_PROPERTY_FIELDS = ('pk', 'name', 'description', 'created_by', 'created_at')

class Point(models.Model):
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    edit_session = models.ForeignKey(EditSession, on_delete=models.SET_NULL, blank=True, null=True)
    geom = models.PointField(srid=4326)

    def can_edit(self, user):
        if self.edit_session:
            return self.edit_session.user == user or self.edit_session.is_expired

    def is_editing_active(self):
        return self.edit_session and not self.edit_session.is_expired

    def to_abstract_dict(self):
        return model_to_dict(self, exclude=('edit_session', 'geom'))

    def __str__(self):
        return self.name + " (" + self.created_by.username + ")"


class LineString(models.Model):
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    points = models.ManyToManyField(Point, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    edit_session = models.ForeignKey(EditSession, on_delete=models.SET_NULL, blank=True, null=True)
    geom = models.LineStringField(srid=4326)

    def can_edit(self, user):
        if self.edit_session:
            return self.edit_session.user == user or self.edit_session.is_expired

    def is_editing_active(self):
        return self.edit_session and not self.edit_session.is_expired

    def to_abstract_dict(self):
        return model_to_dict(self, exclude=('edit_session', 'geom'))

    def __str__(self):
        return self.name + " (" + self.created_by.username + ")"


class Polygon(models.Model):
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    points = models.ManyToManyField(Point, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    edit_session = models.ForeignKey(EditSession, on_delete=models.SET_NULL, blank=True, null=True)
    geom = models.PolygonField(srid=4326)

    def can_edit(self, user):
        if self.edit_session:
            return self.edit_session.user == user or self.edit_session.is_expired

    def is_editing_active(self):
        return self.edit_session and not self.edit_session.is_expired

    def __str__(self):
        return self.name + " (" + self.created_by.username + ")"


# Map Models

class Star(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    map = models.ForeignKey('Map', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(default=timezone.now)


class Map(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    points = models.ManyToManyField(Point, blank=True)
    polylines = models.ManyToManyField(LineString, blank=True)
    polygons = models.ManyToManyField(Polygon, blank=True)
    base_map = models.ForeignKey(BaseMap, on_delete=models.SET_NULL, blank=True, null=True)
    public = models.BooleanField(default=False)
    visits = models.IntegerField(default=0)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    collaborators = models.ManyToManyField(User, related_name='collaborators', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_viewed = models.DateTimeField(auto_now=True)

    @property
    def star_count(self):
        return Star.objects.filter(map=self).count()

    def can_edit(self, user):
        return self.owner == user or user in self.collaborators.all()

    def can_view(self, user):
        return self.public or self.owner == user or user in self.collaborators.all()

    def can_delete(self, user):
        return self.owner == user

    def to_abstract_dict(self):
        _map_dict = model_to_dict(self, exclude=['points', 'polylines', 'polygons', 'base_map', 'owner', 'collaborators', 'last_viewed'])
        _map_dict['collaborator_count'] = self.collaborators.count()
        _map_dict['public'] = self.public
        _map_dict['stars'] = self.star_count
        _map_dict['last_viewed'] = humanize.naturaltime(self.last_viewed)
        _map_dict['owner'] = self.owner.username
        return _map_dict

    def to_detailed_dict(self):
        _map_dict = model_to_dict(self, exclude=['points', 'polylines', 'polygons', 'base_map', 'owner', 'collaborators', 'last_viewed'])
        _map_dict['collaborators'] = [collaborator.username for collaborator in self.collaborators.all()]
        _map_dict['base_map'] = self.base_map.to_dict() if self.base_map else None
        _map_dict['public'] = self.public
        _map_dict['stars'] = self.star_count
        _map_dict['created_at'] = humanize.naturaltime(self.created_at)
        _map_dict['last_viewed'] = humanize.naturaltime(self.last_viewed)
        _map_dict['owner'] = self.owner.username
        return _map_dict

    def get_points_json(self):
        serialize('geojson',
                  self.points.all().order_by('-created_at'),
                  geometry_field='geom',
                  fields=GEOJSON_PROPERTY_FIELDS
                  )

    def get_polylines_json(self):
        serialize('geojson',
                  self.polylines.all().order_by('-created_at'),
                  geometry_field='geom',
                  fields=GEOJSON_PROPERTY_FIELDS
                  )

    def get_polygons_json(self):
        serialize('geojson',
                  self.polygons.all().order_by('-created_at'),
                  geometry_field='geom',
                  fields=GEOJSON_PROPERTY_FIELDS
                  )

    def __str__(self):
        return self.name + " (" + self.owner.username + ")"
