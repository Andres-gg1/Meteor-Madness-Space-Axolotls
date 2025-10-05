import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import "leaflet.heat"; 

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
  // Convert energy from megatons to joules
  const energyJ = energyMt * 4.184e15;
  // Empirical formula to approximate earthquake magnitude
  const magnitude = (2 / 3) * Math.log10(energyJ) - 3.2;
  return magnitude.toFixed(2);
}

async function fetchSimilarEarthquakes(lat, lon, magnitude) {
  const minMag = magnitude - 0.5;
  const maxMag = parseFloat(magnitude) + 0.5;
  alert(minMag);
  alert(maxMag)

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&starttime=1900-01-01&minmagnitude=${minMag}&maxmagnitude=${maxMag}`;

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


// -----------------------------
// Dummy Impact Data
// -----------------------------
function generateDummyImpactData() {
  const latitude = 10.0;
  const longitude = -70.0;
  return {
    id: "AST-2035X",
    name: "Itzelia",
    size_m: 450,
    class: "Stony Iron",
    energy_mt: 1,
    global_changes: "Minor cooling, dust in stratosphere",
    atmospheric_entry: "High-angle, high-energy explosion",
    latitude,
    longitude,
    zones: [
      { id: 'crater', radius: 3, description: "Permanent impact crater zone.", color: 'black' },
      { id: 'thermal', radius: 25, description: "Severe burns and fires from thermal radiation.", color: 'red' },
      { id: 'airblast', radius: 60, description: "Shockwave destruction.", color: 'orange' },
      { id: 'ejecta', radius: 120, description: "Secondary impacts and debris.", color: 'yellow' },
      { id: 'seismic', radius: 200, description: "Major seismic damage.", color: 'gray' },
    ]
  };
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

    // Scale intensity by log population for better visual
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


  useEffect(() => {
    const data = generateDummyImpactData();
    setImpact(data);
  }, []); 
  
  
  useEffect(() => {
    if (!impact) return; 
  
    const maxRadius = Math.max(...impact.zones.map(z => z.radius));
  
    fetch(`http://localhost:5000/api/cities?lat=${impact.latitude}&lon=${impact.longitude}&radius=${maxRadius}`)
      .then(res => res.json())
      .then(cityData => {
        setCities(cityData);
  
        const accumPopulation = {};
        let prevPopulation = 0;
  
        impact.zones.forEach(zone => {
          const affectedCities = findCitiesWithinRadius(impact.latitude, impact.longitude, zone.radius, cityData);
          const zonePopulation = affectedCities.reduce((sum, city) => sum + (city.population || 0), 0);
          accumPopulation[zone.id] = prevPopulation + zonePopulation;
          prevPopulation = accumPopulation[zone.id];
        });
  
        setZonesPopulation(accumPopulation);
      })
      .catch(err => console.error("Error loading city data:", err));

      const magnitude = calculateImpactMagnitude(impact.energy_mt);

      fetchSimilarEarthquakes(impact.latitude, impact.longitude, magnitude)
        .then(eq => setEarthquakes(eq));


  }, [impact]);

  if (!impact) return <div>Loading map...</div>;

  const position = [impact.latitude, impact.longitude];
  const zones = impact.zones;

  const heatmapPoints = cities.map(city => [city.latitude, city.longitude, city.population || 0]);

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

      {/* Impact Marker */}
      <Marker position={position}>
        <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
          {renderMeteorInfo()}
        </Tooltip>
      </Marker>

      {/* Impact Zones */}
      {zones.slice().reverse().map((zone, i) => (
        <Circle
          key={zone.id}
          center={position}
          radius={zone.radius * 1000}
          pathOptions={{
            color: zone.color,
            fillOpacity: 0.15 + i * 0.05,
            fill: true,
            weight: 1,
            pointerEvents: i === zones.length - 1 ? 'auto' : 'none'
          }}
        >
          <Tooltip>{renderZoneInfo(zone)}</Tooltip>
        </Circle>
      ))}

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
              <b>Magnitude:</b> {eq.mag}<br />
              <b>Place:</b> {eq.place}<br />
              <b>Date:</b> {eq.time.toLocaleDateString()}
            </div>
          </Tooltip>
        </Marker>
      ))}

    </MapContainer>
  );
};

export default ImpactMap;
