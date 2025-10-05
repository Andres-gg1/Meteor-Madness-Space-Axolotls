from calculations.Coords_Info import get_density
from calculations.Energy_Atm import simulate_meteor_atmospheric_entry
from calculations.Impact_Calculations import ImpactCalculations
from calculations.Properties_Calculations import PropertiesCalculations
from flask import Flask, jsonify, request
from flask_cors import CORS
import json, math, requests, numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app)

API_KEY = 'SXbAVOHpuhWILqtB5rIDFshxLN6PrVQAKwhLNBQh'

# --------------------- Impact Route --------------------- #
@app.route('/impact', methods=['GET'])
def impact():
    velocity = float(request.args.get('velocity'))
    mass = float(request.args.get('mass'))
    diameter = float(request.args.get('diameter'))
    angle = float(request.args.get('angle'))
    latitude = float(request.args.get('latitude'))
    longitude = float(request.args.get('longitude'))

    (final_energy, final_velocity, final_mass, lost_energy, percent_lost) = simulate_meteor_atmospheric_entry(diameter, velocity, angle)

    asteroid_density = (mass / ((4/3) * math.pi * (diameter/2)**3)) / 1000  # Convert to g/cm³
    ground_density = get_density(latitude, longitude)  # g/cm³

    init_crater_diameter = ImpactCalculations.calculateInitialCraterDiameter(diameter, asteroid_density, velocity, ground_density['100-200cm'])
    excavated_mass = ImpactCalculations.calculateExcavatedMass(init_crater_diameter, ground_density['100-200cm'])
    minimal_ejection_velocity = ImpactCalculations.calculateMinimalEjectionVelocity(init_crater_diameter)
    percent_to_space = ImpactCalculations.calculateMassToEscapeGravity(minimal_ejection_velocity, excavated_mass)

    return jsonify({
        'percent_to_space': percent_to_space,
        'impact_energy': final_energy,
        'lost_energy': lost_energy,
        'impact_energy_tnt': PropertiesCalculations.convertJoulesTNTTons(final_energy),
        'impact_energy_hiroshima': PropertiesCalculations.convertJoulesHiroshima(final_energy),
    })

# --------------------- Home Route --------------------- #
@app.route('/')
def home():
    return jsonify({"status": "OK", "message": "Welcome to the NASA Impact Visualizer API!"})

# --------------------- NASA Asteroid Helpers --------------------- #
def get_asteroid_data(asteroid_id, api_key=API_KEY):
    url = f"https://api.nasa.gov/neo/rest/v1/neo/{asteroid_id}?api_key={api_key}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None

def get_orbital_data(asteroid_id, target_date_str):
    asteroid_json = get_asteroid_data(asteroid_id)
    if not asteroid_json or 'orbital_data' not in asteroid_json:
        return None
    
    orbital_data = asteroid_json['orbital_data']
    
    e = float(orbital_data['eccentricity'])
    a = float(orbital_data['semi_major_axis'])
    i = np.deg2rad(float(orbital_data['inclination']))
    w = np.deg2rad(float(orbital_data['perihelion_argument']))
    omega = np.deg2rad(float(orbital_data['ascending_node_longitude']))
    
    nu_path = np.linspace(0, 2 * np.pi, 360)
    r_path = a * (1 - e**2) / (1 + e * np.cos(nu_path))
    x_orb_path, y_orb_path = r_path * np.cos(nu_path), r_path * np.sin(nu_path)
    x_rot1, y_rot1 = x_orb_path * np.cos(w) - y_orb_path * np.sin(w), x_orb_path * np.sin(w) + y_orb_path * np.cos(w)
    x_rot2, y_rot2, z_rot2 = x_rot1, y_rot1 * np.cos(i), y_rot1 * np.sin(i)
    x_final_path = (x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega)).tolist()
    y_final_path = (x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega)).tolist()
    z_final_path = z_rot2.tolist()
    
    M0 = np.deg2rad(float(orbital_data['mean_anomaly']))
    n = np.deg2rad(float(orbital_data['mean_motion']))
    t0 = datetime.strptime(orbital_data['orbit_determination_date'], '%Y-%m-%d %H:%M:%S')
    t = datetime.strptime(target_date_str, '%Y-%m-%d')
    delta_t = (t - t0).total_seconds() / 86400.0
    M = M0 + n * delta_t
    E = M
    for _ in range(10): 
        E = M + e * np.sin(E)
    nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))
    r_pos = a * (1 - e * np.cos(E))
    x_orb_pos, y_orb_pos = r_pos * np.cos(nu), r_pos * np.sin(nu)
    x_rot1, y_rot1 = x_orb_pos * np.cos(w) - y_orb_pos * np.sin(w), x_orb_pos * np.sin(w) + y_orb_pos * np.cos(w)
    x_rot2, y_rot2, z_rot2 = x_rot1, y_rot1 * np.cos(i), y_rot1 * np.sin(i)
    x_final_pos = x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega)
    y_final_pos = x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega)
    z_final_pos = z_rot2
    
    return {
        "asteroid_name": asteroid_json.get('name', 'Unknown'),
        "orbit_path": { "x": x_final_path, "y": y_final_path, "z": z_final_path },
        "asteroid_position": { "x": x_final_pos, "y": y_final_pos, "z": z_final_pos }
    }

# --------------------- Orbital Data Route --------------------- #
@app.route('/api/orbital-data', methods=['POST'])
def orbital_data_api():
    data = request.get_json()
    if not data or 'asteroid_id' not in data or 'target_date' not in data:
        return jsonify({"error": "Missing data"}), 400
    
    orbital_data = get_orbital_data(data['asteroid_id'], data['target_date'])
    
    if orbital_data:
        return jsonify(orbital_data)
    else:
        return jsonify({"error": "Invalid Asteroid ID or NASA API Error."}), 404

# --------------------- Cities Route --------------------- #
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.route("/api/cities")
def get_cities_in_radius():
    with open("cities_population.json", "r", encoding="utf-8") as f:
        cities = json.load(f)

    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        radius = float(request.args.get("radius"))
    except (TypeError, ValueError):
        return jsonify({"error": "Missing or invalid lat/lon/radius"}), 400

    affected = [city for city in cities if haversine_distance(lat, lon, city["latitude"], city["longitude"]) <= radius]
    return jsonify(affected)

# --------------------- Run Server --------------------- #
if __name__ == '__main__':
    app.run(debug=True, port=5000)
