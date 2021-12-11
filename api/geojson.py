import datetime
import json


FEATURE_TEMPLATE = """{{
    "type": "Feature",
    "id": "{id}",
    "geometry": {{
        "type": "{type}",
        "coordinates": {coordinates}
    }},
    "geometry_name": "the_geom",
    "properties": {properties}
}}"""

FEATURE_COLLECTION_TEMPLATE = """{{
    "type": "FeatureCollection",
    "features": [{features}],
    "totalFeatures": {totalFeatures},
    "numberMatched": {numberMatched},
    "numberReturned": {numberReturned},
    "timeStamp": "{timeStamp}",
    "crs": {{
        "type": "name",
        "properties": {{
            "name": "urn:ogc:def:crs:EPSG::4326"
        }}
    }}
}}"""


def create_point_feature(feature_id, coordinates, properties):
    feature = FEATURE_TEMPLATE.format(
        id=feature_id,
        type='Point',
        coordinates='null' if not coordinates else (','.join([('[' + (','.join([str(v) for v in pair])) + ']') for pair in coordinates])),
        properties=str(properties).replace('\'', '\"').replace('\": None', '\": null')
    )

    return feature


def create_point_collection(features, total_features=0):
    collectionSize = len(features)

    collection = FEATURE_COLLECTION_TEMPLATE.format(
        features=','.join(features),
        totalFeatures=collectionSize if total_features == 0 else total_features,
        numberMatched=collectionSize,
        numberReturned=collectionSize,
        timeStamp=datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

    return collection

