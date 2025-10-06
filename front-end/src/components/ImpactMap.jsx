import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import "leaflet.heat"; 
import {URL} from '../App.js';

// Leaflet marker setup
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

//min 10 mts
//max 100km

// -----------------------------
// Utilities
// -----------------------------
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findCitiesWithinRadius(lat, lon, radiusKm, cities) {
  return cities.filter(city => haversineDistance(lat, lon, city.latitude, city.longitude) <= radiusKm);
}

function calculateImpactMagnitude(energyMt) {
  // Convert energy from megatons (Mt) to Joules (J).
  // 1 Mt of TNT ≈ 4.184e15 Joules.
  const energyJ = energyMt * 4.184e15;
  
  // Empirical formula (derived from Gutenberg-Richter relation) 
  // to approximate the seismic magnitude equivalent.
  const magnitude = (2 / 3) * Math.log10(energyJ) - 3.2;
  
  // Return the magnitude formatted to two decimal places.
  return magnitude.toFixed(2);
}

async function fetchSimilarEarthquakes(lat, lon, magnitude) {
  const baseMag = parseFloat(magnitude); 
  
  const minMag = baseMag - 0.5;
  const maxMag = baseMag + 0.5;

  alert(minMag);

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&starttime=1900-01-01&minmagnitude=${minMag}&maxmagnitude=${maxMag}`;
  console.log(url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features.map(f => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place,
      time: new Date(f.properties.time),
      coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
    }));
  } catch (err) {
    console.error("Error fetching earthquakes:", err);
    return [];
  }
}

const landZones = [
  { id: 'crater', radius: 3, description: "Permanent impact crater zone.", color: 'black' },
  { id: 'thermal', radius: 25, description: "Severe burns and fires from thermal radiation.", color: 'red' },
  { id: 'airblast', radius: 60, description: "Shockwave destruction.", color: 'orange' },
  { id: 'ejecta', radius: 120, description: "Secondary impacts and debris.", color: 'yellow' },
  { id: 'seismic', radius: 200, description: "Major seismic damage.", color: 'gray' },
];

const waterZones = [
  { id: 'tsunami', radius: 300, description: "Massive tsunami generation and coastal flooding.", color: 'blue' },
  { id: 'vapor_cloud', radius: 80, description: "Water vapor cloud and atmospheric effects.", color: 'lightblue' },
];

const coastalZones = [
  { id: 'mixed_wave', radius: 150, description: "Coastal tsunami and partial land flooding.", color: 'purple' },
  { id: 'shockwave', radius: 40, description: "Shockwave from near-shore explosion.", color: 'orange' },
];



// -----------------------------
// Dummy Impact Data
// -----------------------------
// ------------------------------------------------
// Dummy Impact Data Generator (auto zone selection)
// ------------------------------------------------
function generateDummyImpactData({ latitude, longitude, isWater, isCoastal }) {
  const baseData = {
    energy_mt: 0.05,
    latitude,
    longitude,
    zones: isCoastal ? coastalZones : isWater ? waterZones : landZones
  };
  return baseData;
}




// -----------------------------
// Info Panel Helper
// -----------------------------
const renderInfoPanel = (title, content) => (
  <div style={{
    fontSize: "12px",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: "8px",
    borderRadius: "6px",
    maxWidth: "350px",
    lineHeight: "1.4em",
    pointerEvents: "auto",
    wordWrap: "break-word",
    whiteSpace: "normal",
  }}>
    <b>{title}</b><br />
    {content}
  </div>
);

const HeatmapLayer = ({ points = [] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const heatPoints = points.map(p => [p[0], p[1], Math.log10(p[2] || 1)]);
    const heat = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 20,
      maxZoom: 10,
      max: 1.0,
    }).addTo(map);
    return () => map.removeLayer(heat);
  }, [map, points]);
  return null;
};


// -----------------------------
// MAIN COMPONENT
// -----------------------------
const ImpactMap = () => {
  const [impact, setImpact] = useState(null);
  const [cities, setCities] = useState([]);
  const [zonesPopulation, setZonesPopulation] = useState({});
  const [earthquakes, setEarthquakes] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [landGeoJson, setLandGeoJson] = useState(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => setLandGeoJson(data))
      .catch(err => console.error("Error loading GeoJSON:", err));
  }, []);


  useEffect(() => {
    if (!landGeoJson) return;
  
    const latitude = 20.5;
    const longitude = -90.0;
    const point = turf.point([longitude, latitude]);
  
    let isWater = true;
    let isCoastal = false;
    let minDistanceToLand = Infinity;
  
    for (const feature of landGeoJson.features) {
      try {
        if (!feature.geometry || !feature.geometry.coordinates) continue;
  
        const geomType = feature.geometry.type;
        const polygons =
          geomType === "Polygon"
            ? [feature]
            : geomType === "MultiPolygon"
            ? feature.geometry.coordinates.map(
                (coords) => turf.polygon(coords, feature.properties)
              )
            : [];
  
        for (const polygon of polygons) {
          if (turf.booleanPointInPolygon(point, polygon)) {
            isWater = false;
            isCoastal = false;
            minDistanceToLand = 0;
            break;
          }
  
          const boundary = turf.polygonToLine(polygon);
          const nearest = turf.nearestPointOnLine(boundary, point);
          const dist = turf.distance(point, nearest);
          if (!isNaN(dist) && dist < minDistanceToLand) {
            minDistanceToLand = dist;
          }
        }
  
        if (!isWater) break;
      } catch (err) {
        console.warn("Skipping invalid feature:", err);
      }
    }
  
    if (isWater && minDistanceToLand < 30) {
      isCoastal = true;
    }
  
    const data = generateDummyImpactData({
      latitude,
      longitude,
      isWater,
      isCoastal,
    });
  
    setImpact(data);
  }, [landGeoJson]);
  

  // ------------------------------------------------
  // 3️⃣ Fetch cities and earthquakes once impact is known
  // ------------------------------------------------
  useEffect(() => {
    if (!impact) return;

    const maxRadius = Math.max(...impact.zones.map(z => z.radius));

    // Fetch nearby cities
    fetch(`${URL}/api/cities?lat=${impact.latitude}&lon=${impact.longitude}&radius=${maxRadius}`)
      .then(res => res.json())
      .then(cityData => {
        setCities(cityData);

        const accumPopulation = {};
        let prevPopulation = 0;

        impact.zones.forEach(zone => {
          const affectedCities = findCitiesWithinRadius(
            impact.latitude,
            impact.longitude,
            zone.radius,
            cityData
          );
          const zonePopulation = affectedCities.reduce(
            (sum, city) => sum + (city.population || 0),
            0
          );
          accumPopulation[zone.id] = prevPopulation + zonePopulation;
          prevPopulation = accumPopulation[zone.id];
        });

        setZonesPopulation(accumPopulation);
      })
      .catch(err => console.error("Error loading city data:", err));

    // Fetch historical earthquakes near the area
    const magnitude = calculateImpactMagnitude(impact.energy_mt);
    fetchSimilarEarthquakes(impact.latitude, impact.longitude, magnitude)
      .then(eq => setEarthquakes(eq));

  }, [impact]);
  
  if (!impact || !landGeoJson) return <div>Loading map...</div>;

  const position = [impact.latitude, impact.longitude];
  const zones = impact.zones;

  const heatmapPoints = cities.map(city => [city.latitude, city.longitude, city.population || 0]);

  const impactType = impact.zones === waterZones
    ? "Water Impact"
    : impact.zones === coastalZones
    ? "Coastal Impact"
    : "Land Impact";

  const renderMeteorInfo = () => {
    const content = (
      <>
        <b>ID:</b> {impact.id}<br />
        <b>Name:</b> {impact.name}<br />
        <b>Size:</b> {impact.size_m} m<br />
        <b>Class:</b> {impact.class}<br />
        <b>Energy:</b> {impact.energy_mt} Mt<br />
        <b>Global Changes:</b> {impact.global_changes}<br />
        <b>Atmospheric Entry:</b> {impact.atmospheric_entry}
      </>
    );
    return renderInfoPanel("METEOR INFO", content);
  };

  const renderZoneInfo = (zone) => {
    const pop = zonesPopulation[zone.id] || 0;
    const content = (
      <>
        <b>Radius:</b> {zone.radius} km<br />
        <b>Effect:</b> {zone.description}<br />
        <b>Population affected:</b> {pop.toLocaleString()}
      </>
    );
    return renderInfoPanel(`${zone.id.toUpperCase()} ZONE`, content);
  };

  const renderCityInfo = (city) => {
    const content = (
      <>
        <b>Population:</b> {city.population.toLocaleString()}<br />
        <b>Lat:</b> {city.latitude.toFixed(2)}<br />
        <b>Lon:</b> {city.longitude.toFixed(2)}
      </>
    );
    return renderInfoPanel(city.name, content);
  };

  return (
    <MapContainer center={position} zoom={6} style={{ height: "100vh", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  
      {/* Impact marker */}
      <Marker position={position}>
        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
          <div style={{ fontSize: '12px' }}>
            <b>{impactType}</b><br />
            Name: Dummy meteor<br />
            Energy: {impact.energy_mt} Mt
          </div>
        </Tooltip>
      </Marker>
  
      {/* Impact Zones (Rendered Largest to Smallest for proper hover interaction) */}
      {!impact.isWater && zones.slice().reverse().map((zone, i) => {
        // The smallest circle (last in the reversed array) will have the highest index (i=zones.length-1)
        const isTopmost = i === zones.length - 1;
  
        return (
          <Circle
            key={zone.id}
            center={position}
            radius={zone.radius * 1000}
            pathOptions={{
              color: zone.color,
              // Adjust opacity based on index (i=0 is largest/back)
              fillOpacity: 0.15 + i * 0.05,
              fill: true,
              weight: 1,
              // Only the smallest circle (highest Z-index) is interactive
              pointerEvents: isTopmost ? 'auto' : 'none', 
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              {/* CORRECTED: Calling renderZoneInfo to show population */}
              {renderZoneInfo(zone)} 
            </Tooltip>
          </Circle>
        );
      })}
  
      {/* Heatmap */}
      {cities.length > 0 && <HeatmapLayer points={heatmapPoints} />}
  
      {/* Historical Earthquakes */}
      {earthquakes.map(eq => (
  <Marker key={eq.id} position={eq.coords} icon={L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })}>
    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
      <div style={{ fontSize: '12px' }}>
        <b>Magnitude:</b> {eq.mag}<br/>
        <b>Place:</b> {eq.place}<br/>
        <b>Date:</b> {eq.time.toLocaleDateString()}
      </div>
    </Tooltip>
  </Marker>
))}

  
      {/* Note: The previous code had the Historical Earthquakes block duplicated here. It's removed. */}
  
      {/* Sliding Earthquake Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isPanelOpen ? '350px' : '0',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.95)',
          overflowX: 'hidden',
          transition: '0.3s',
          padding: isPanelOpen ? '20px' : '0',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setIsPanelOpen(false)}
          style={{ position: 'absolute', top: 10, right: 10, fontSize: '18px' }}
        >
          ×
        </button>
        <h3>Similar Earthquakes</h3>
        {earthquakes.length === 0 && <p>No similar earthquakes found.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {earthquakes.map(eq => (
            <li key={eq.id} style={{ marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              <b>{eq.place}</b> <br />
              Magnitude: {eq.mag} <br />
              <button
                onClick={() => setSelectedEq(eq)}
                style={{ marginTop: '5px', fontSize: '12px' }}
              >
                More Info
              </button>
            </li>
          ))}
        </ul>
  
        {selectedEq && (
          <div style={{ marginTop: '20px', backgroundColor: '#36454F', padding: '10px', borderRadius: '6px' }}>
            <h4>Details</h4>
            <b>Place:</b> {selectedEq.place} <br />
            <b>Magnitude:</b> {selectedEq.mag} <br />
            <b>Date:</b> {selectedEq.time.toLocaleString()} <br />
            <b>Coordinates:</b> {selectedEq.coords[0].toFixed(2)}, {selectedEq.coords[1].toFixed(2)}
            <br />
            <button onClick={() => setSelectedEq(null)} style={{ marginTop: '10px', fontSize: '12px' }}>
              Close Info
            </button>
          </div>
        )}
      </div>
  
      {/* Button to open panel */}
      <button
        onClick={() => setIsPanelOpen(true)}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 1001,
          padding: '8px 12px',
          fontSize: '14px',
          borderRadius: '4px',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Show Earthquakes
      </button>
    </MapContainer>
  );
};

export default ImpactMap;
