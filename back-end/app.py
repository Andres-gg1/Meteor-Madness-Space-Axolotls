from calculations.Coords_Info import get_density
from calculations.Energy_Atm import simulate_meteor_atmospheric_entry
from calculations.Impact_Calculations import ImpactCalculations
from calculations.Properties_Calculations import PropertiesCalculations
from flask import Flask, jsonify, request
from flask_cors import CORS
import json, math, requests, os, numpy as np
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv('NASA_API_KEY')
if not API_KEY:
    raise ValueError("NASA_API_KEY not found in environment variables. Please check your .env file.")

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

    asteroid_density = (mass / ((4/3) * math.pi * (diameter/2)**3)) / 1000  # g/cm³
    ground_density = get_density(latitude, longitude)  # g/cm³

    init_crater_diameter = ImpactCalculations.calculateInitialCraterDiameter(diameter, asteroid_density, velocity, ground_density)
    excavated_mass = ImpactCalculations.calculateExcavatedMass(init_crater_diameter, ground_density)
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

    # Orbit path
    nu_path = np.linspace(0, 2 * np.pi, 360)
    r_path = a * (1 - e**2) / (1 + e * np.cos(nu_path))
    x_orb_path = r_path * np.cos(nu_path)
    y_orb_path = r_path * np.sin(nu_path)
    x_rot1 = x_orb_path * np.cos(w) - y_orb_path * np.sin(w)
    y_rot1 = x_orb_path * np.sin(w) + y_orb_path * np.cos(w)
    x_rot2 = x_rot1
    y_rot2 = y_rot1 * np.cos(i)
    z_rot2 = y_rot1 * np.sin(i)
    x_final_path = (x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega)).tolist()
    y_final_path = (x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega)).tolist()
    z_final_path = z_rot2.tolist()

    # Current position
    M0 = np.deg2rad(float(orbital_data['mean_anomaly']))
    n = np.deg2rad(float(orbital_data['mean_motion']))
    t0 = datetime.strptime(orbital_data['orbit_determination_date'], '%Y-%m-%d %H:%M:%S')
    t = datetime.strptime(target_date_str, '%Y-%m-%d')
    delta_t = (t - t0).total_seconds() / 86400.0
    M = M0 + n * delta_t

    # Solve Kepler's equation iteratively
    E = M
    for _ in range(20):  # más iteraciones
        E_next = M + e * np.sin(E)
        if abs(E_next - E) < 1e-6:
            break
        E = E_next

    nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))
    r_pos = a * (1 - e * np.cos(E))
    x_orb_pos = r_pos * np.cos(nu)
    y_orb_pos = r_pos * np.sin(nu)
    x_rot1 = x_orb_pos * np.cos(w) - y_orb_pos * np.sin(w)
    y_rot1 = x_orb_pos * np.sin(w) + y_orb_pos * np.cos(w)
    x_rot2 = x_rot1
    y_rot2 = y_rot1 * np.cos(i)
    z_rot2 = y_rot1 * np.sin(i)
    x_final_pos = float(x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega))
    y_final_pos = float(x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega))
    z_final_pos = float(z_rot2)

    return {
        "asteroid_name": asteroid_json.get('name', 'Unknown'),
        "orbit_path": {"x": x_final_path, "y": y_final_path, "z": z_final_path},
        "asteroid_position": {"x": x_final_pos, "y": y_final_pos, "z": z_final_pos}
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

# --------------------- Asteroids List --------------------- #
@app.route('/api/asteroids', methods=['GET'])
def get_asteroids():
    page = request.args.get('page', 0, type=int)
    
    try:
        url = f"https://api.nasa.gov/neo/rest/v1/neo/browse?api_key={API_KEY}&page={page}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        neo_list = data.get("near_earth_objects", [])
        if not neo_list:
            return jsonify({"asteroids": [], "page": page, "message": "No asteroids found"}), 200

        asteroids = [{"id": a["id"], "name": a["name"]} for a in neo_list]
        return jsonify({"asteroids": asteroids, "page": page})
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "NASA API timed out"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error connecting to NASA API: {str(e)}"}), 502

# --------------------- Search Asteroids --------------------- #
@app.route('/api/asteroids/search', methods=['GET'])
def search_asteroids():
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({"asteroids": []})

    asteroid_list = []
    seen_ids = set()
    try:
        for page in range(5):
            url = f"https://api.nasa.gov/neo/rest/v1/neo/browse?api_key={API_KEY}&page={page}&size=20"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            for a in data.get("near_earth_objects", []):
                asteroid_id = a["id"]
                asteroid_name = a["name"]
                
                if (query.lower() in asteroid_name.lower() or query == asteroid_id) and asteroid_id not in seen_ids:
                    asteroid_list.append({"id": asteroid_id, "name": asteroid_name})
                    seen_ids.add(asteroid_id)
                    if query == asteroid_id:
                        return jsonify({"asteroids": [{"id": asteroid_id, "name": asteroid_name}]})

            if len(asteroid_list) >= 50:
                break

        return jsonify({"asteroids": asteroid_list[:50]})
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error connecting to NASA API: {str(e)}"}), 500

# --------------------- Asteroid Details --------------------- #
@app.route('/api/asteroid-details', methods=['POST'])
def asteroid_details():
    data = request.json
    asteroid_id = data.get("asteroid_id")
    if not asteroid_id:
        return jsonify({"error": "Missing asteroid_id"}), 400

    try:
        url = f"https://api.nasa.gov/neo/rest/v1/neo/{asteroid_id}?api_key={API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        asteroid = response.json()

        diam_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
        diam_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
        diameter_avg = (diam_min + diam_max) / 2
        albedo = 0.15  # assumed

        mass, density, complex_type = PropertiesCalculations.estimateMass(diameter_avg, albedo)

        if asteroid["close_approach_data"]:
            velocity = float(asteroid["close_approach_data"][0]["relative_velocity"]["kilometers_per_second"]) * 1000
        else:
            velocity = 20000

        kinetic_energy = PropertiesCalculations.calculateKineticEnergyByMass(mass, velocity)
        tnt_equivalent = PropertiesCalculations.convertJoulesTNTTons(kinetic_energy)
        hiroshima_equivalent = PropertiesCalculations.convertJoulesHiroshima(kinetic_energy)
        fragmentation_energy = PropertiesCalculations.aproximateFragmentationEnergy(kinetic_energy)
        safe_distance_km = PropertiesCalculations.aproximateSafeDistance(diameter_avg) / 1000

        mass, density_g_cm3, complex_type = PropertiesCalculations.estimateMass(diameter_avg, albedo)
        # Convert density from g/cm³ to kg/m³ for frontend display
        density_kg_m3 = PropertiesCalculations.convert_density_to_kg_m3(density_g_cm3)

        return jsonify({
            "name": asteroid.get("name"),
            "designation": asteroid.get("designation", "Unknown"),
            "absolute_magnitude_h": asteroid.get("absolute_magnitude_h"),
            "estimated_diameter": {
                "estimated_diameter_min": diam_min,
                "estimated_diameter_max": diam_max,
                "estimated_diameter_avg": diameter_avg
            },
            "is_potentially_hazardous": asteroid.get("is_potentially_hazardous_asteroid"),
            "nasa_jpl_url": asteroid.get("nasa_jpl_url"),

            # Calculated physical properties
            "albedo_assumed": albedo,
            "complex_type": complex_type,
            "density": density_kg_m3,  # Now in kg/m³
            "mass": mass,
            "velocity": velocity,

            # Energy calculations
            "kinetic_energy_joules": kinetic_energy,
            "energy_tnt_tons": tnt_equivalent,
            "energy_hiroshima_bombs": hiroshima_equivalent,
            "fragmentation_energy_joules": fragmentation_energy,
            "safe_distance_km": safe_distance_km
        })

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

# --------------------- Run Server --------------------- #
if __name__ == '__main__':
    app.run(debug=True, port=5000)
     