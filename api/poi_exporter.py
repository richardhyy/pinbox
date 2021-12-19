import shapefile
from api.models import Point, LineString, Polygon
import datetime
import os
import uuid
import zipfile

CACHE_DIR = 'cache'
EXPORT_CACHE_SUBDIR = 'poi_export'

"""
Point model contains the following fields:
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    edit_session = models.ForeignKey(EditSession, on_delete=models.SET_NULL, blank=True, null=True)
    geom = models.PointField(srid=4326)
    
LineString model contains the following fields:
    name = models.TextField(max_length=100)
    description = models.TextField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    edit_session = models.ForeignKey(EditSession, on_delete=models.SET_NULL, blank=True, null=True)
    geom = models.LineStringField(srid=4326)
"""


def _create_prj_file(shapefile_path):
    """
    Create projection file for the given shapefile which defines the CRS as WGS84
    :param shapefile_path: path to the shapefile
    :return:
    """
    prj_file = open(shapefile_path + '.prj', 'w')
    prj_file.write('GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG",'
                   '"7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",'
                   '0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]')
    prj_file.close()


def export_entities_to_shapefile(point_list, line_list, polygon_list):
    """
    Export a list of POI to shapefile
    :param point_list:
    :param line_list:
    :param polygon_list:
    :return: shapefile file path
    """
    output_folder = prepare_destination_folder()
    output_shp_folder = os.path.join(output_folder, generate_random_filename(None)) # The `shapefile' contains multiple files

    if len(point_list) > 0:
        # Create shapefile for points
        w = shapefile.Writer(os.path.join(output_shp_folder, 'points'))
        w.autoBalance = 1
        w.field('name', 'C')
        w.field('description', 'C')
        w.field('created_by', 'C')
        w.field('created_at', 'C')
        for point in point_list:
            w.point(point.geom.x, point.geom.y)
            w.record(point.name, point.description, point.created_by.username, point.created_at.strftime('%Y-%m-%d %H:%M:%S'))
        w.close()
        # Create projection file
        _create_prj_file(os.path.join(output_shp_folder, 'points'))

    if len(line_list) > 0:
        # Create shapefile for lines
        w = shapefile.Writer(os.path.join(output_shp_folder, 'lines'))
        w.autoBalance = 1
        w.field('name', 'C')
        w.field('description', 'C')
        w.field('created_by', 'C')
        w.field('created_at', 'C')
        for line in line_list:
            w.line([list(line.geom.coords)])
            w.record(line.name, line.description, line.created_by.username, line.created_at.strftime('%Y-%m-%d %H:%M:%S'))
        w.close()
        # Create projection file
        _create_prj_file(os.path.join(output_shp_folder, 'lines'))

    if len(polygon_list) > 0:
        # Create shapefile for polygons
        w = shapefile.Writer(os.path.join(output_shp_folder, 'polygons'))
        w.autoBalance = 1
        w.field('name', 'C')
        w.field('description', 'C')
        w.field('created_by', 'C')
        w.field('created_at', 'C')
        for polygon in polygon_list:
            w.poly([list(polygon.geom.exterior.coords)])
            w.record(polygon.name, polygon.description, polygon.created_by.username, polygon.created_at.strftime('%Y-%m-%d %H:%M:%S'))
        w.close()
        # Create projection file
        _create_prj_file(os.path.join(output_shp_folder, 'polygons'))


    # Zip shapefile
    # A `shapefile' contains multiple parts, so we need to zip them

    zip_file_path = os.path.join(output_folder, generate_random_filename('zip'))
    # Create zip file to archive the entire output_shp_folder
    with zipfile.ZipFile(zip_file_path, 'w') as zip_file:
        for root, dirs, files in os.walk(output_shp_folder):
            for file in files:
                zip_file.write(os.path.join(root, file), os.path.basename(file))
    return zip_file_path


# MARK: - Helper functions

def prepare_destination_folder():
    """
    Create folder (CACHE_DIR/EXPORT_CACHE_SUBDIR) then return the path
    :return: Path of the folder
    """
    cache_dir = os.path.join(CACHE_DIR, EXPORT_CACHE_SUBDIR)
    # cache_dir = os.path.join(cache_dir, datetime.datetime.now().strftime('%Y-%m-%d'))
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)

    return cache_dir


def generate_random_filename(extension):
    """
    Generate a random filename with extension
    :param extension:
    :return:
    """
    output_file_name = str(uuid.uuid4()).replace('-', '') + ('.' + extension if extension else '')
    return output_file_name


def csv_field_escape(field):
    """
    Escape a field for csv
    :param field:
    :return:
    """
    if field is str:
        field = field.replace('"', '""')
        if ',' in field:
            field = '"' + field + '"'
    return field
