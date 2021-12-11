import shapefile
from openpyxl import Workbook
from api.models import Poi
import datetime
import os
import uuid
import zipfile

CACHE_DIR = 'cache'
EXPORT_CACHE_SUBDIR = 'poi_export'

"""
POI model contains the following fields:
    name = models.TextField(max_length=100)
    aliases = ArrayField(models.TextField(max_length=100), blank=True, null=True)
    types = ArrayField(models.TextField(max_length=25), blank=True, null=True)
    address = models.TextField(max_length=255)
    city = models.TextField(max_length=25)
    province = models.TextField(max_length=25)
    tel = models.TextField(max_length=25, blank=True, null=True)
    website = models.TextField(max_length=255, blank=True, null=True)
    photos = models.ManyToManyField(PoiPhoto, blank=True)
    additional_info = models.OneToOneField(PoiAdditionalInfo, on_delete=models.CASCADE, blank=True, null=True)
    longitude = models.FloatField()
    latitude = models.FloatField()
"""


def export_poi_to_excel(poi_list):
    """
    Export a list of POI to excel file
    :param poi_list:
    :return: excel file path
    """
    wb = Workbook()
    ws = wb.active

    ws.append(['Name', 'Address', 'City', 'Province', 'Longitude', 'Latitude'])

    for poi in poi_list:
        ws.append([poi.name, poi.address, poi.city, poi.province, poi.longitude, poi.latitude])

    output_folder = prepare_destination_folder()
    output_file_name = generate_random_filename('xlsx')
    output_path = os.path.join(output_folder, output_file_name)
    wb.save(output_path)
    return output_path


def export_poi_to_shapefile(poi_list):
    """
    Export a list of POI to shapefile
    :param poi_list:
    :return: shapefile file path
    """
    output_folder = prepare_destination_folder()
    output_file_name = generate_random_filename(None)
    output_shp_folder = os.path.join(output_folder, output_file_name) # The `shapefile' contains multiple files

    output_path = os.path.join(output_shp_folder, output_file_name)

    # Create shapefile
    w = shapefile.Writer(output_path)
    w.autoBalance = 1
    w.field('Name', 'C')
    w.field('Address', 'C')
    w.field('City', 'C')
    w.field('Province', 'C')
    w.field('Longitude', 'N', decimal=10)
    w.field('Latitude', 'N', decimal=10)

    for poi in poi_list:
        w.point(poi.longitude, poi.latitude)
        w.record(poi.name, poi.address, poi.city, poi.province, poi.longitude, poi.latitude)

    w.close()

    # Zip shapefile
    # A `shapefile' contains multiple parts, so we need to zip them

    zip_file_path = os.path.join(output_folder, output_file_name + '.zip')
    # Create zip file to archive the entire output_shp_folder
    with zipfile.ZipFile(zip_file_path, 'w') as zip_file:
        for root, dirs, files in os.walk(output_shp_folder):
            for file in files:
                zip_file.write(os.path.join(root, file), os.path.basename(file))
    return zip_file_path


def export_poi_to_csv(poi_list):
    """
    Export a list of POI to csv file
    :param poi_list:
    :return: csv file path
    """
    output_folder = prepare_destination_folder()
    output_file_name = generate_random_filename('csv')
    output_path = os.path.join(output_folder, output_file_name)

    with open(output_path, 'w') as f:
        f.write('Name,Address,City,Province,Longitude,Latitude\n')
        for poi in poi_list:
            f.write(f'{csv_field_escape(poi.name)},{csv_field_escape(poi.address)},{csv_field_escape(poi.city)},{csv_field_escape(poi.province)},{poi.longitude},{poi.latitude}\n')

    f.close()
    return output_path


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
