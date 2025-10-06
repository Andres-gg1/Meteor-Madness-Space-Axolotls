import csv
import os
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
    raise ValueError("GOOGLE_MAPS_API_KEY not found in environment variables. Please check your .env file.")

GREENLAND_BOUNDS = {'lat_min': 59.0, 'lat_max': 84.0, 'lon_min': -75.0, 'lon_max': -10.0}
ANTARCTICA_BOUNDS = {'lat_min': -90.0, 'lat_max': -60.0, 'lon_min': -180.0, 'lon_max': 180.0}

def validate_coordinates(lat, lon):
    if not (-90 <= lat <= 90):
        raise ValueError(f"Latitude {lat} must be between -90 and 90 degrees")
    if not (-180 <= lon <= 180):
        raise ValueError(f"Longitude {lon} must be between -180 and 180 degrees")

def haversine(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    return 6371 * 2 * asin(sqrt(a))

def is_water(lat, lon, debug=False):
    validate_coordinates(lat, lon)
    retries = 3

    for attempt in range(retries):
        try:
            url = "https://maps.googleapis.com/maps/api/elevation/json"
            params = {
                'locations': f"{lat},{lon}",
                'key': GOOGLE_MAPS_API_KEY
            }

            response = requests.get(url, params=params, timeout=10)

            if debug:
                print(f"Google Elevation API - Status Code: {response.status_code}")

            if response.status_code == 200:
                data = response.json()

                if debug:
                    print(f"Google Elevation API - Full Response: {data}")

                if data.get('status') == 'OK' and data.get('results'):
                    elevation = data['results'][0]['elevation']

                    if debug:
                        resolution = data['results'][0].get('resolution', 'N/A')
                        print(f"Google Elevation API - Elevation: {elevation} meters")
                        print(f"Google Elevation API - Resolution: {resolution} meters")

                    if elevation <= 1:
                        if debug:
                            print(f"Google Elevation API - Detected as WATER (elevation <= 1m)")
                        return True
                    else:
                        if debug:
                            print(f"Google Elevation API - Detected as LAND (elevation > 1m)")
                        return False
                else:
                    if debug:
                        print(f"Google Elevation API error: {data.get('status')}")
                        if 'error_message' in data:
                            print(f"Error message: {data['error_message']}")
                    return None

            else:
                if debug:
                    print(f"Google Elevation API HTTP error: {response.status_code}")
                    print(f"Response text: {response.text}")
                return None

        except requests.RequestException as e:
            if debug:
                print(f"Request error in water detection (attempt {attempt + 1}): {e}")
            if attempt == retries - 1:
                return None
        except Exception as e:
            if debug:
                print(f"Error in water detection (attempt {attempt + 1}): {e}")
            if attempt == retries - 1:
                return None

def is_greenland(lat, lon):
    validate_coordinates(lat, lon)
    return (GREENLAND_BOUNDS['lat_min'] <= lat <= GREENLAND_BOUNDS['lat_max'] and
            GREENLAND_BOUNDS['lon_min'] <= lon <= GREENLAND_BOUNDS['lon_max'])

def is_antarctica(lat, lon):
    validate_coordinates(lat, lon)
    return lat <= ANTARCTICA_BOUNDS['lat_max']

def get_location_type(lat, lon):
    if is_antarctica(lat, lon):
        return 'antarctica'
    
    if is_greenland(lat, lon):
        return 'greenland'
    
    water_check = is_water(lat, lon)
    if water_check is True:
        return 'water'
    elif water_check is False:
        return 'land'
    else:
        return 'land'

def nearby_cities(lat, lon, radius_km=None):
    validate_coordinates(lat, lon)
    
    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
    CITIES_FILE = os.path.join(parent_dir, "cities_filtered.csv")

    if not os.path.exists(CITIES_FILE):
        raise FileNotFoundError(f"Cities file '{CITIES_FILE}' not found")
    
    cities_with_distance = []
    try:
        with open(CITIES_FILE, encoding='utf-8') as f:
            reader = csv.reader(f)
            for row_num, parts in enumerate(reader, 1):
                try:
                    if len(parts) < 15:
                        continue
                    name = parts[1]
                    city_lat = float(parts[4])
                    city_lon = float(parts[5])
                    population = int(parts[14].replace(",", ""))
                except (ValueError, IndexError) as e:
                    continue

                if population < MIN_POPULATION:
                    continue

                dist = haversine(lat, lon, city_lat, city_lon)
                cities_with_distance.append((name, dist))
                
    except IOError as e:
        raise IOError(f"Error reading cities file: {e}")

    cities_with_distance.sort(key=lambda x: x[1])
    if radius_km is None:
        return [name for name, _ in cities_with_distance]
    else:
        return [name for name, dist in cities_with_distance if dist <= radius_km]


def soil_bulk_density(lat, lon):
    validate_coordinates(lat, lon)

    densities = {}
    for depth in DEPTH_RANGES:
        params = {'lon': lon, 'lat': lat, 'property': 'bdod', 'depth': depth, 'value': 'mean'}
        try:
            response = requests.get(SOILGRIDS_URL, params=params, timeout=10)
            if response.status_code == 429:
                sleep(0.5)
                continue

            response.raise_for_status()

            data = response.json()
            if 'properties' in data and 'layers' in data['properties']:
                for layer in data['properties']['layers']:
                    if layer.get('name') == 'bdod':
                        for d in layer.get('depths', []):
                            mean_val = d['values'].get('mean')
                            if mean_val is not None:
                                # SoilGrids returns cg/cm³: divide by 100 -> g/cm³, multiply by 1000 -> kg/m³
                                densities[d['label']] = mean_val * 10
        except requests.RequestException as e:
            print(f"Error fetching soil data for depth {depth}: {e}")
            densities[depth] = None
        except (KeyError, ValueError) as e:
            print(f"Error parsing soil data for depth {depth}: {e}")
            densities[depth] = None
    return densities

def get_density(lat, lon, radius_km=5, debug=False):
    """Returns density in kg/m³ for all depth ranges"""
    location_type = get_location_type(lat, lon)
    
    if location_type == 'water':
        if debug: print(f"Location is over water (ocean, sea, lake, etc.)")
        return {depth: 1 for depth in DEPTH_RANGES}  # No soil density for water
    
    elif location_type == 'antarctica':
        if debug: print(f"Location is in Antarctica")
        return {depth: 900 for depth in DEPTH_RANGES}  # kg/m³
    
    elif location_type == 'greenland':
        if debug: print(f"Location is in Greenland")
        return {depth: 900 for depth in DEPTH_RANGES}  # kg/m³
    
    else:
        cities = nearby_cities(lat, lon, radius_km)
        if cities:
            if debug: print(f"Location within city: {cities[0]}")
            return {depth: 2650 for depth in DEPTH_RANGES}  # kg/m³
        
        elevation = None
        try:
            url = "https://maps.googleapis.com/maps/api/elevation/json"
            params = {'locations': f"{lat},{lon}", 'key': GOOGLE_MAPS_API_KEY}
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK' and data.get('results'):
                    elevation = data['results'][0]['elevation']
        except Exception as e:
            if debug: print(f"Error fetching elevation: {e}")
        
        if elevation is not None and elevation >= 3000:
            if debug: print(f"High elevation ({elevation} m), using mountain/rock density")
            return {depth: 2000 for depth in DEPTH_RANGES}  # kg/m³
        
        if debug: print("Rural location or no nearby large city, querying SoilGrids...")
        densities = soil_bulk_density(lat, lon)
        
        if not any(densities.values()):
            if debug: print("SoilGrids returned no data, using default soil density")
            return {depth: 1300 for depth in DEPTH_RANGES}  # kg/m³
        
        return densities

if __name__ == '__main__':
    
    (lat, lon) = (20.677561150261983, -103.4128081509739)
    print(f"Coordinates: ({lat:.4f}, {lon:.4f})")
    try:
        density = get_density(lat, lon)
        print(f"Density: {density['100-200cm']}\n")
    except Exception as e:
        print(f"Error processing coordinates ({lat}, {lon}): {e}\n")