# Trajectory and Orbital Calculation

Of course, here is the complete documentation translated into English.

***

#### General Description

This Python module provides the tools to interact with the NASA NEOWS (Near Earth Object Web Service) API. It allows you to fetch asteroid data, calculate its complete orbital path, and determine its specific position on a given date. Finally, it exposes this functionality through an API endpoint using Flask.

***

#### 1. NASA Asteroid Helpers

**1.1. `get_asteroid_data(asteroid_id, api_key)`**

This function handles the request to the NASA API to obtain the raw data for a specific asteroid.

* Purpose: To get the complete JSON object with all available information for an asteroid, identified by its `asteroid_id`.
* Parameters:
  * `asteroid_id` (str): The unique identifier for the NEO (Near Earth Object).
  * `api_key` (str, optional): Your NASA API key. By default, it uses a predefined variable `API_KEY`.
* Process:
  1. Constructs the API endpoint URL.
  2. Makes a `GET` request to the URL.
  3. Handles potential connection errors or unsuccessful responses (e.g., 404, 500).
* Return Value:
  * A dictionary (JSON) with the asteroid's data if the request is successful.
  * `None` if an error occurs during the request.

Python

```
def get_asteroid_data(asteroid_id, api_key=API_KEY):
    url = f"https://api.nasa.gov/neo/rest/v1/neo/{asteroid_id}?api_key={api_key}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException:
        return None
```

***

**1.2. `get_orbital_data(asteroid_id, target_date_str)`**

The main function that processes an asteroid's data to calculate its orbit and position.

* Purpose: To calculate the 3D orbital path and the Cartesian position (x, y, z) of an asteroid for a specific date.
* Parameters:
  * `asteroid_id` (str): The identifier for the NEO.
  * `target_date_str` (str): The date for which the position is to be calculated, in `'YYYY-MM-DD'` format.
* Return Value:
  * A dictionary containing the asteroid's name, the `orbit_path`, and the `asteroid_position`.
  * `None` if the data cannot be fetched or processed.

Python

```
def get_orbital_data(asteroid_id, target_date_str):
    asteroid_json = get_asteroid_data(asteroid_id)
    if not asteroid_json or 'orbital_data' not in asteroid_json:
        return None
    
    orbital_data = asteroid_json['orbital_data']
    
    # ... rest of the code ...
```

***

#### Calculation Blocks in `get_orbital_data`

**Block 1: Orbital Elements Extraction**

First, the six standard Keplerian orbital elements are extracted from the API response. These elements define the shape and orientation of the orbit in space. The angular units are converted from degrees to radians for trigonometric calculations.

* `e`: Eccentricity (![](data:,)) - Defines the shape of the ellipse.
* `a`: Semi-major axis (![](data:,)) - Defines the size of the orbit.
* `i`: Inclination (![](data:,)) - The angle of the orbit with respect to the reference plane (the ecliptic).
* `w`: Argument of perihelion (![](data:,)) - The orientation of the ellipse in its orbital plane.
* `omega`: Longitude of the ascending node (![](data:,)) - The point where the orbit crosses the reference plane from south to north.

Python

```
    e = float(orbital_data['eccentricity'])
    a = float(orbital_data['semi_major_axis'])
    i = np.deg2rad(float(orbital_data['inclination']))
    w = np.deg2rad(float(orbital_data['perihelion_argument']))
    omega = np.deg2rad(float(orbital_data['ascending_node_longitude']))
```

**Block 2: Full Orbital Path Calculation**

This block calculates 360 points along the orbit to be able to draw it. It is based on the relationship between the radial distance ($$r$$) and the true anomaly ($$ν$$).

1.  Position in the Orbital Plane: The radial distance ($$r$$) is calculated for each point of the orbit using the true anomaly ($$ν$$) from 0 to 360 degrees. The 2D coordinates in the orbital plane (`x_orb_path`, `y_orb_path`) are derived from $$r$$ and $$ν$$.

    Formula: $$r=a(1−e2)​/1+ecos(ν)$$
2. Transformation to 3D Coordinates: The 2D coordinates are rotated and projected into the 3D reference coordinate system (ecliptic) by applying the rotations defined by the angles $$ω$$, $$i$$, and $$Ω$$.

Python

```
    nu_path = np.linspace(0, 2 * np.pi, 360)
    r_path = a * (1 - e**2) / (1 + e * np.cos(nu_path))
    x_orb_path, y_orb_path = r_path * np.cos(nu_path), r_path * np.sin(nu_path)
    
    # Rotations to transform to the ecliptic plane
    x_rot1, y_rot1 = x_orb_path * np.cos(w) - y_orb_path * np.sin(w), x_orb_path * np.sin(w) + y_orb_path * np.cos(w)
    x_rot2, y_rot2, z_rot2 = x_rot1, y_rot1 * np.cos(i), y_rot1 * np.sin(i)
    x_final_path = (x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega)).tolist()
    y_final_path = (x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega)).tolist()
    z_final_path = z_rot2.tolist()
```

**Block 3: Asteroid Position Calculation on a Specific Date**

This block determines where the asteroid is in its orbit on the `target_date`.

1.  Mean Anomaly Calculation (M): The current mean anomaly ($$M$$) is calculated based on the initial mean anomaly ($$M0​$$), the mean motion ($$n$$), and the elapsed time ($$Δt$$) since the orbit determination date.

    Formula: $$M=M0​+n⋅Δt$$
2. Solving Kepler's Equation: Kepler's equation ($$M=E−esin(E)$$) cannot be solved algebraically for the eccentric anomaly ($$E$$). Therefore, it is solved iteratively (using a simplified Newton-Raphson method) to find $$E$$.
3. True Anomaly ($$ν$$) and Radial Distance ($$r$$) Calculation: Once $$E$$ is obtained, the true anomaly ($$ν$$), which is the actual angle of the asteroid in its orbit, is calculated. Its radial distance ($$r$$) at that point is also calculated.
4. Transformation to 3D Coordinates: Just as with the path, the 2D position in the orbital plane is transformed into 3D Cartesian coordinates (`x_final_pos`, `y_final_pos`, `z_final_pos`) using the same rotations.

Python

```
    M0 = np.deg2rad(float(orbital_data['mean_anomaly']))
    n = np.deg2rad(float(orbital_data['mean_motion']))
    t0 = datetime.strptime(orbital_data['orbit_determination_date'], '%Y-%m-%d %H:%M:%S')
    t = datetime.strptime(target_date_str, '%Y-%m-%d')
    delta_t = (t - t0).total_seconds() / 86400.0
    M = M0 + n * delta_t
    
    # Solve Kepler's Equation
    E = M
    for _ in range(10): 
        E = M + e * np.sin(E)
        
    nu = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))
    r_pos = a * (1 - e * np.cos(E))
    
    # Transform position to 3D coordinates
    x_orb_pos, y_orb_pos = r_pos * np.cos(nu), r_pos * np.sin(nu)
    x_rot1, y_rot1 = x_orb_pos * np.cos(w) - y_orb_pos * np.sin(w), x_orb_pos * np.sin(w) + y_orb_pos * np.cos(w)
    x_rot2, y_rot2, z_rot2 = x_rot1, y_rot1 * np.cos(i), y_rot1 * np.sin(i)
    x_final_pos = x_rot2 * np.cos(omega) - y_rot2 * np.sin(omega)
    y_final_pos = x_rot2 * np.sin(omega) + y_rot2 * np.cos(omega)
    z_final_pos = z_rot2
```

***

#### 2. API Route (`Orbital Data Route`)

**`POST /api/orbital-data`**

This Flask endpoint exposes the orbital calculation functionality.

* Method: `POST`
*   Expected JSON Payload:

    JSON

    ```
    {
        "asteroid_id": "3542519",
        "target_date": "2025-12-25"
    }
    ```
* Process:
  1. Receives and validates the request JSON.
  2. Calls the `get_orbital_data` function with the provided data.
  3. Returns the calculated results or an error message.
*   Successful Response (200 OK):

    JSON

    ```
    {
        "asteroid_name": "(2010 PK9)",
        "orbit_path": {
            "x": [...], "y": [...], "z": [...]
        },
        "asteroid_position": {
            "x": 1.234, "y": -0.567, "z": 0.123
        }
    }
    ```
* Error Responses:
  * `400 Bad Request`: If `asteroid_id` or `target_date` are missing from the request.
  * `404 Not Found`: If the `asteroid_id` is invalid or if there is an error communicating with the NASA API.

Python

```
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
```
