from django.contrib import admin
from .models import *


class MapAdmin(admin.ModelAdmin):
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return 'points', 'polylines', 'polygons'
        return ()


admin.site.register(Map, MapAdmin)

admin.site.register([BaseMap, Point, LineString, Polygon])
