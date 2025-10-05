# ImpactMap

#### Overview

`ImpactMap` is a React component that visualizes the potential effects of an asteroid impact on a geographic area using **Leaflet** maps. It integrates multiple layers of information, including impact zones, population heatmaps, and historical earthquakes, and provides interactive tooltips and panels for detailed information.

***

#### State Management

* **impact**: Stores data about the asteroid impact, including position, energy, class, size, and impact zones. Initialized via dummy data.
* **cities**: Stores the list of cities fetched from an API within the maximum impact radius.
* **zonesPopulation**: Maps each impact zone to the total population affected.
* **earthquakes**: Stores historical earthquake data similar in magnitude and proximity to the impact.
* **isPanelOpen**: Boolean controlling the visibility of the sliding earthquake info panel.
* **selectedEq**: Stores the currently selected earthquake for detailed view.

***

#### Utilities

1. **haversineDistance**\
   Calculates the great-circle distance between two latitude/longitude points on the Earth’s surface using the Haversine formula.
2. **findCitiesWithinRadius**\
   Filters a list of cities to those within a given radius from a specified latitude and longitude.
3. **calculateImpactMagnitude**\
   Converts an impact energy in megatons to an estimated earthquake magnitude using an empirical formula.
4. **fetchSimilarEarthquakes**\
   Fetches historical earthquakes from the USGS API within 500 km of the impact point and within ±0.5 magnitude of the calculated impact magnitude.
5. **generateDummyImpactData**\
   Produces a mock asteroid impact dataset, including latitude, longitude, size, class, energy, and multiple impact zones with radii and effects.

***

#### Map and Layers

1. **MapContainer**
   * Provides the base Leaflet map.
   * Centered at the impact latitude and longitude.
   * Zoom level set to 6.
   * Occupies the full viewport height and width.
2. **TileLayer**
   * Uses OpenStreetMap tiles for the map base layer.
3. **Impact Marker**
   * A `Marker` at the asteroid impact location.
   * Includes a permanent `Tooltip` displaying the asteroid information (ID, name, size, class, energy, global effects, atmospheric entry).
4. **Impact Zones**
   * Rendered as `Circle` layers for each zone in the impact data.
   * Radius is scaled in meters (`radius * 1000`).
   * Each circle has a unique color and opacity to indicate severity.
   * Tooltips show zone-specific information: radius, effect, and population affected.
5. **Population Heatmap**
   * Uses a custom `HeatmapLayer` component that integrates Leaflet's heatmap plugin.
   * Points are scaled by log of city population for visual clarity.
   * Provides a heatmap overlay representing population density around the impact.
6. **Historical Earthquake Markers**
   * Displays markers for earthquakes similar in magnitude to the impact.
   * Each marker has a permanent tooltip with magnitude, location, and date.
   * Selected earthquakes can be expanded to show detailed information in the sliding panel.

***

#### Info Panels

1. **Meteor Info Panel**
   * Displays detailed information about the asteroid.
   * Rendered as a styled overlay inside the tooltip of the impact marker.
2. **Zone Info Panels**
   * Show radius, description, and estimated population affected for each impact zone.
3. **City Info Panels**
   * Display population and coordinates for individual cities (used in heatmap or future enhancements).
4. **Sliding Earthquake Panel**
   * Fixed-position panel that lists historical earthquakes.
   * Can be opened/closed with buttons.
   * Each list item provides basic information and a "More Info" button.
   * Expanded earthquake details include place, magnitude, date, and coordinates.

***

#### Data Fetching and Effects

* On component mount, dummy asteroid data is generated and stored in state.
* When `impact` is set:
  1. Fetches nearby cities from an API endpoint.
  2. Calculates cumulative population affected for each impact zone.
  3. Calculates estimated earthquake magnitude from impact energy.
  4. Fetches historical earthquakes similar in magnitude and proximity.
* Updates state asynchronously for cities, zonesPopulation, and earthquakes.

***

#### Interaction and UX

* **Tooltips**: Provide detailed, styled information for impact marker, zones, and earthquakes.
* **Heatmap**: Visually indicates population concentration.
* **Sliding Panel**: Allows users to explore historical earthquakes related to impact magnitude.
* **Buttons**: Toggle visibility of the earthquake panel and show detailed earthquake information.
* **Layer Order**: Impact zones are rendered in reverse order for correct layering of tooltips and pointer interactions.

***

#### Visualization Logic

* **Impact Zones**: Inner zones overlayed with higher opacity; outer zones semi-transparent.
* **Population Heatmap**: Intensity proportional to log of city population to prevent skew from large cities.
* **Earthquake Filtering**: Only displays earthquakes within 500 km and ±0.5 magnitude of impact-equivalent magnitude.
* **Markers**: Default Leaflet markers are customized for impact and historical earthquakes.

***

#### Summary

`ImpactMap` is a comprehensive geospatial visualization tool for asteroid impacts. It combines:

* Realistic impact zones with population analysis.
* Interactive map and tooltips for immediate information.
* Historical earthquake comparison using USGS data.
* Population heatmaps to show potential human impact.
* Sliding panels and detailed modals for interactive exploration.

The component is fully reactive to updates in asteroid data and dynamically fetches supplementary information, making it suitable for simulation and risk assessment scenarios.
