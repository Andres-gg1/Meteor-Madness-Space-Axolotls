import os
import csv
import requests
from math import radians, cos, sin, asin, sqrt
from dotenv import load_dotenv
from time import sleep

load_dotenv()

CITIES_FILE = "cities_filtered.csv"
MIN_POPULATION = 400_000
SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
DEPTH_RANGES = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm']

GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
if not GOOGLE_MAPS_API_KEY:
    raise ValueError("GOOGLE_MAPS_API_KEY not found in environment variables.")

GREENLAND_BOUNDS = {'lat_min': 59.0, 'lat_max': 84.0, 'lon_min': -75.0, 'lon_max': -10.0}
ANTARCTICA_BOUNDS = {'lat_min': -90.0, 'lat_max': -60.0, 'lon_min': -180.0, 'lon_max': 180.0}

def validate_coordinates(lat, lon):
    if not (-90 <= lat <= 90):
        raise ValueError(f"Latitude {lat} out of range")
    if not (-180 <= lon <= 180):
        raise ValueError(f"Longitude {lon} out of range")

def haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    return 6371 * 2 * asin(sqrt(a))

def is_water(lat, lon):
    validate_coordinates(lat, lon)
    url = "https://maps.googleapis.com/maps/api/elevation/json"
    params = {'locations': f"{lat},{lon}", 'key': GOOGLE_MAPS_API_KEY}
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        if data.get('status') == 'OK' and data.get('results'):
            elevation = data['results'][0]['elevation']
            return elevation <= 1
    except:
        return None
    return None

def is_greenland(lat, lon):
    validate_coordinates(lat, lon)
    return (GREENLAND_BOUNDS['lat_min'] <= lat <= GREENLAND_BOUNDS['lat_max'] and
            GREENLAND_BOUNDS['lon_min'] <= lon <= GREENLAND_BOUNDS['lon_max'])

def is_antarctica(lat, lon):
    validate_coordinates(lat, lon)
    return lat <= ANTARCTICA_BOUNDS['lat_max']

def get_location_type(lat, lon):
    if is_antarctica(lat, lon): return 'antarctica'
    if is_greenland(lat, lon): return 'greenland'
    water = is_water(lat, lon)
    return 'water' if water else 'land'

def nearby_cities(lat, lon, radius_km=5):
    validate_coordinates(lat, lon)
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cities_file = os.path.join(parent_dir, "cities_filtered.csv")
    if not os.path.exists(cities_file):
        return []
    cities = []
    with open(cities_file, encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            try:
                name = row[1]
                city_lat = float(row[4])
                city_lon = float(row[5])
                population = int(row[14].replace(",", ""))
                if population < MIN_POPULATION:
                    continue
                dist = haversine(lat, lon, city_lat, city_lon)
                if dist <= radius_km:
                    cities.append(name)
            except: 
                continue
    return cities

def soil_bulk_density(lat, lon):
    validate_coordinates(lat, lon)
    densities = {}
    last_valid = None
    for depth in DEPTH_RANGES:
        params = {'lon': lon, 'lat': lat, 'property': 'bdod', 'depth': depth, 'value': 'mean'}
        try:
            response = requests.get(SOILGRIDS_URL, params=params, timeout=10)
            if response.status_code == 429:
                sleep(0.5)
                continue
            response.raise_for_status()
            data = response.json()
            mean_val = None
            if 'properties' in data and 'layers' in data['properties']:
                for layer in data['properties']['layers']:
                    if layer.get('name') == 'bdod':
                        for d in layer.get('depths', []):
                            if d['label'] == depth:
                                mean_val = d['values'].get('mean')
                                break
            if mean_val is not None:
                densities[depth] = mean_val * 10  # SoilGrids cg/cm³ -> kg/m³
                last_valid = densities[depth]
            else:
                densities[depth] = last_valid
        except:
            densities[depth] = last_valid
    return densities

def get_density(lat, lon, radius_km=5):
    location_type = get_location_type(lat, lon)
    if location_type == 'water': return {depth: 1 for depth in DEPTH_RANGES}
    if location_type in ['antarctica', 'greenland']: return {depth: 900 for depth in DEPTH_RANGES}
    if nearby_cities(lat, lon, radius_km): return {depth: 2650 for depth in DEPTH_RANGES}
    densities = soil_bulk_density(lat, lon)
    # fallback default if all values are None
    for depth in DEPTH_RANGES:
        if densities[depth] is None:
            densities[depth] = 1300
    return densities

if __name__ == '__main__':
    lat, lon = 20.677561150261983, -103.4128081509739
    dens = get_density(lat, lon)
    # Return the last available depth if 100-200cm missing
    last_depth = DEPTH_RANGES[-1]
    print(f"Density at {last_depth}: {dens[last_depth]} kg/m³")
