---
description: >-
  This document details how to use the NASA Near Earth Object Web Service
  (NEOWS) API to retrieve information about near-Earth objects.
---

# NEOWS (NASA Near Earth Object Web Service)

### Base Endpoint

To get detailed information about a specific NEO (Near Earth Object), use the following endpoint:

```
http://api.nasa.gov/neo/rest/v1/neo/{neo_id}?api_key=YOUR_API_KEY
```

This endpoint returns the specified object's physical and orbital properties, as well as its close-approach data.

***

### 1. General NEO Information

This section contains the object's identifiers and general characteristics.

| Field                               | Type   | Description                                                     |
| ----------------------------------- | ------ | --------------------------------------------------------------- |
| `id`                                | string | The internal identifier for the NEO in the JPL database.        |
| `neo_reference_id`                  | string | A unique reference identifier for the NEO.                      |
| `name`                              | string | The official name of the NEO.                                   |
| `designation`                       | string | A provisional or alternative designation.                       |
| `nasa_jpl_url`                      | string | The URL to the JPL Small-Body Database for this NEO.            |
| `absolute_magnitude_h`              | float  | The absolute magnitude (H), used to estimate the object's size. |
| `is_potentially_hazardous_asteroid` | bool   | Indicates whether the NEO is considered potentially hazardous.  |

***

### 2. Estimated Diameter (`estimated_diameter`)

This object contains the estimated diameter range of the NEO in different metric and imperial units.

| Sub-field                           | Type  | Description                               |
| ----------------------------------- | ----- | ----------------------------------------- |
| `kilometers.estimated_diameter_min` | float | Minimum estimated diameter in kilometers. |
| `kilometers.estimated_diameter_max` | float | Maximum estimated diameter in kilometers. |
| `meters.estimated_diameter_min/max` | float | Estimated diameter in meters.             |
| `miles.estimated_diameter_min/max`  | float | Estimated diameter in miles.              |
| `feet.estimated_diameter_min/max`   | float | Estimated diameter in feet.               |

***

### 3. Close Approach Data (`close_approach_data`)

A list containing all recorded close approaches of the NEO to other planetary bodies.

| Field                       | Type   | Description                                                                                 |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `close_approach_date`       | string | The date of the close approach in `YYYY-MM-DD` format.                                      |
| `close_approach_date_full`  | string | The full date and time of the close approach.                                               |
| `epoch_date_close_approach` | int    | The date of the event in epoch format (milliseconds since 1970).                            |
| `relative_velocity`         | object | Relative velocity to the body in km/s, km/h, and mph.                                       |
| `miss_distance`             | object | Minimum distance to the body in astronomical units, kilometers, miles, and lunar distances. |
| `orbiting_body`             | string | The main body around which the close approach occurs (e.g., "Earth").                       |

***

### 4. Orbital Data (`orbital_data`)

This object contains all the orbital parameters that define the NEO's trajectory.

| Field                          | Type   | Description                                                                            |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| `orbit_id`                     | string | A unique identifier for the orbital solution.                                          |
| `orbit_determination_date`     | string | The date the orbit was determined.                                                     |
| `first_observation_date`       | string | The date of the first observation used for the calculation.                            |
| `last_observation_date`        | string | The date of the last observation used.                                                 |
| `data_arc_in_days`             | int    | The duration of the observation arc in days.                                           |
| `observations_used`            | int    | The total number of observations used.                                                 |
| `orbit_uncertainty`            | string | The orbit uncertainty code (where `0` is very certain).                                |
| `minimum_orbit_intersection`   | float  | The Minimum Orbit Intersection Distance (MOID) with Earth in astronomical units (AU).  |
| `jupiter_tisserand_invariant`  | float  | Tisserand's invariant with respect to Jupiter, used for classification.                |
| `epoch_osculation`             | float  | The epoch of osculation in Julian Days (JD).                                           |
| `eccentricity (e)`             | float  | The eccentricity of the orbit.                                                         |
| `semi_major_axis (a)`          | float  | The semi-major axis in astronomical units (AU).                                        |
| `inclination (i)`              | float  | The orbital inclination in degrees.                                                    |
| `ascending_node_longitude (Ω)` | float  | The longitude of the ascending node in degrees.                                        |
| `perihelion_distance (q)`      | float  | The distance to the perihelion in astronomical units (AU).                             |
| `perihelion_argument (w)`      | float  | The argument of perihelion in degrees.                                                 |
| `aphelion_distance (Q)`        | float  | The distance to the aphelion in astronomical units (AU).                               |
| `perihelion_time (tp)`         | float  | The epoch of the perihelion in Julian Days (JD).                                       |
| `mean_anomaly (M)`             | float  | The mean anomaly in degrees.                                                           |
| `mean_motion (n)`              | float  | The mean motion in degrees per day.                                                    |
| `orbital_period`               | float  | The orbital period in days.                                                            |
| `equinox`                      | string | The reference epoch for the coordinates (usually J2000).                               |
| `orbit_class`                  | object | The orbit class with a description and orbital range.                                  |
| `is_sentry_object`             | bool   | Indicates if the object is being monitored by the Sentry program (future impact risk). |
