from flask import Flask, jsonify, request
from flask_cors import CORS
import json, math

app = Flask(__name__)
CORS(app)

API_KEY = 'SXbAVOHpuhWILqtB5rIDFshxLN6PrVQAKwhLNBQh'

@app.route('/')
def home():
    #return "Welcome to the NASA Impact Visualizer API!"
    return jsonify({"status": "OK", "message": "Welcome to the NASA Impact Visualizer API!"})

def get_asteroid_data(asteroid_id):
    """
    Fetch asteroid data from NASA's API.
    """

    url = f"https://api.nasa.gov/neo/rest/v1/neo/{asteroid_id}?api_key={API_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Asteroid not found"}), 404
    

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius (km)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
@app.route("/api/cities")
def get_cities_in_radius():

    print("Loading city dataset...")
    with open("cities_population.json", "r", encoding="utf-8") as f:
        cities = json.load(f)
    print(f"Loaded {len(cities)} cities")

    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        radius = float(request.args.get("radius"))
    except (TypeError, ValueError):
        return jsonify({"error": "Missing or invalid lat/lon/radius"}), 400

    affected = []
    for city in cities:
        dist = haversine_distance(lat, lon, city["latitude"], city["longitude"])
        if dist <= radius:
            affected.append(city)

    return jsonify(affected)


if __name__ == '__main__':
    app.run(debug=True)