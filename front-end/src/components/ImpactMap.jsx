import React, { useState, useEffect } from 'react';
import Navbar from "./navbar";
import { MapContainer, TileLayer, Circle, Tooltip, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import "leaflet.heat"; 
import { useParams } from 'react-router-dom';

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
  
  const magnitude = (2 / 3) * Math.log10(energyJ) - 3.2;

  return magnitude.toFixed(2);
}

function calculateJoulesToMegatons(energyJ) {
  // Convert energy from Joules (J) to megatons (Mt).
  // 1 Mt of TNT ≈ 4.184e15 Joules.
  const energyMt = energyJ / 4.184e15;
  return energyMt.toFixed(2);
}

async function fetchSimilarEarthquakes(lat, lon, magnitude) {
  const baseMag = parseFloat(magnitude); 
  
  const minMag = baseMag - 0.5;
  const maxMag = baseMag + 0.5;

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

function getParamsFromURL() {
  const params = new URLSearchParams(window.location.search);
  // Support both lat/lon and latitude/longitude
  const latitude = parseFloat(params.get("latitude") || params.get("lat"));
  const longitude = parseFloat(params.get("longitude") || params.get("lon"));
  const baseData = {
    energy_mt: calculateJoulesToMegatons(parseFloat(params.get("energy"))),
    latitude,
    longitude,
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
  const [evacPlan, setEvacPlan] = useState(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => setLandGeoJson(data))
      .catch(err => console.error("Error loading GeoJSON:", err));
  }, []);


  useEffect(() => {
    if (!landGeoJson) return;

  const baseData = getParamsFromURL();
  const latitude = baseData.latitude || 0; 
  const longitude = baseData.longitude || 0;

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

    const zones = isWater
      ? (isCoastal ? coastalZones : waterZones)
      : landZones;

    const data = {
      ...baseData,
      latitude,
      longitude,
      isWater,
      isCoastal,
      zones,
    };

    setImpact(data);
  }, [landGeoJson]);
  

  // ------------------------------------------------
  // Fetch cities and earthquakes once impact is known
  // ------------------------------------------------

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

    fetch(`http://localhost:5000/api/evacuation-plan?energy_mt=${impact.energy_mt}&latitude=${impact.latitude}&longitude=${impact.longitude}`)
      .then(res => res.json())
      .then(data => setEvacPlan(data))
      .catch(err => console.error("Error loading evacuation plan:", err));

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
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      {/* Evacuation Plan Panel with Dropdowns */}
      {evacPlan && evacPlan.evacuation_order && (
        <EvacuationPlanPanel evacPlan={evacPlan} zones={zones} />
      )}
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        <div className="w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl border-2 border-violet-800 bg-black relative" style={{height: '80vh'}}>
          <MapContainer center={position} zoom={6} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Impact marker */}
            <Marker position={position}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                <div style={{ fontSize: '12px' }}>
                  <b>{impactType}</b><br />
                  <span className="font-bold text-orange-300">{impact.energy_mt} Mt</span> megatons<br />
                  Name: Dummy meteor
                </div>
              </Tooltip>
            </Marker>
            {/* Impact Zones */}
            {!impact.isWater && zones.slice().reverse().map((zone, i) => {
              const isTopmost = i === zones.length - 1;
              return (
                <Circle
                  key={zone.id}
                  center={position}
                  radius={zone.radius * 1000}
                  pathOptions={{
                    color: zone.color,
                    fillOpacity: 0.15 + i * 0.05,
                    fill: true,
                    weight: 1,
                    pointerEvents: isTopmost ? 'auto' : 'none',
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
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
                    <b>Magnitude:</b> {eq.mag}<br />
                    <b>Place:</b> {eq.place}<br />
                    <b>Date:</b> {eq.time.toLocaleDateString()}
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
          {/* Sliding Earthquake Panel */}
          <div
            className={`fixed left-0 z-[1000] transition-all duration-300 ${isPanelOpen ? 'w-[350px] p-6' : 'w-0 p-0'} flex flex-col bg-black/70 backdrop-blur-lg border-r-2 border-violet-800 shadow-2xl overflow-x-hidden rounded-tr-3xl`}
            style={{color: '#fff', top: '5rem', height: 'calc(100vh - 5rem)'}}
          >
            <button
              onClick={() => setIsPanelOpen(false)}
              className="absolute top-4 right-4 text-3xl text-white hover:text-violet-400 transition-colors"
              aria-label="Close Earthquake Panel"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-4 text-violet-300 tracking-wide">Similar Earthquakes</h3>
            {earthquakes.length === 0 && <p className="text-gray-300">No similar earthquakes found.</p>}
            <ul className="flex-1 overflow-y-auto pr-2 space-y-4">
              {earthquakes.map(eq => (
                <li key={eq.id} className="bg-black/40 rounded-xl p-4 border border-violet-900 shadow hover:shadow-lg transition-shadow">
                  <div className="font-semibold text-lg text-violet-200">{eq.place}</div>
                  <div className="text-sm text-gray-300">Magnitude: <span className="font-bold text-orange-300">{eq.mag}</span></div>
                  <button
                    onClick={() => setSelectedEq(eq)}
                    className="mt-2 px-3 py-1 rounded bg-gradient-to-br from-sky-400 to-blue-600 text-white text-xs font-semibold hover:scale-105 transition-transform"
                  >
                    More Info
                  </button>
                </li>
              ))}
            </ul>
            {selectedEq && (
              <div className="mt-6 bg-black/60 border border-violet-700 rounded-xl p-4 shadow-lg animate-fade-in">
                <h4 className="text-lg font-bold text-violet-200 mb-2">Details</h4>
                <div className="text-sm text-gray-200"><b>Place:</b> {selectedEq.place}</div>
                <div className="text-sm text-gray-200"><b>Magnitude:</b> {selectedEq.mag}</div>
                <div className="text-sm text-gray-200"><b>Date:</b> {selectedEq.time.toLocaleString()}</div>
                <div className="text-sm text-gray-200"><b>Coordinates:</b> {selectedEq.coords[0].toFixed(2)}, {selectedEq.coords[1].toFixed(2)}</div>
                <button
                  onClick={() => setSelectedEq(null)}
                  className="mt-4 px-3 py-1 rounded bg-gradient-to-br from-pink-400 to-violet-600 text-white text-xs font-semibold hover:scale-105 transition-transform"
                >
                  Close Info
                </button>
              </div>
            )}
          </div>
          {/* Button to open panel */}
          <button
            onClick={() => setIsPanelOpen(true)}
            className="absolute bottom-6 right-6 z-[1001] px-4 py-2 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white font-bold shadow-lg hover:scale-105 transition-transform duration-200"
            style={{boxShadow: '0 4px 24px 0 rgba(0,0,0,0.3)'}}
          >
            Show Earthquakes
          </button>
        </div>
      </div>
    </div>
  );
}

const ZONE_EVAC_GUIDELINES = {
  crater: {
    title: "Crater Zone",
    guideline: "Immediate and mandatory evacuation. No entry until cleared by authorities.",
  },
  thermal: {
    title: "Thermal Zone",
    guideline: "Evacuate immediately. Severe burns and fires possible. Seek shelter far from the impact.",
  },
  airblast: {
    title: "Airblast Zone",
    guideline: "Evacuate as soon as possible. Shockwave damage expected. Follow official evacuation routes.",
  },
  ejecta: {
    title: "Ejecta Zone",
    guideline: "Evacuate if possible. Risk of falling debris and secondary impacts.",
  },
  seismic: {
    title: "Seismic Zone",
    guideline: "Prepare for evacuation. Major seismic damage possible. Follow local emergency instructions.",
  },
  tsunami: {
    title: "Tsunami Zone",
    guideline: "Evacuate to higher ground immediately. Massive tsunami and flooding expected.",
  },
  vapor_cloud: {
    title: "Vapor Cloud Zone",
    guideline: "Evacuate if possible. Water vapor and atmospheric effects may be hazardous.",
  },
  mixed_wave: {
    title: "Mixed Wave Zone",
    guideline: "Evacuate coastal areas. Tsunami and partial flooding possible.",
  },
  shockwave: {
    title: "Shockwave Zone",
    guideline: "Evacuate as soon as possible. Shockwave damage expected.",
  },
};

function EvacuationPlanPanel({ evacPlan, zones }) {
  const [openZone, setOpenZone] = React.useState(null);

  const zoneCityMap = {};
  evacPlan.evacuation_order.forEach(city => {
    if (!zoneCityMap[city.zone]) zoneCityMap[city.zone] = [];
    zoneCityMap[city.zone].push(city);
  });

  return (
    <div className="fixed top-1/2 right-8 z-[1200] -translate-y-1/2 bg-black/80 rounded-2xl shadow-xl border border-violet-800 p-6 max-h-[80vh] overflow-y-auto min-w-[350px] w-[400px] flex flex-col items-start" style={{ backdropFilter: 'blur(4px)' }}>
      <h2 className="text-xl font-bold text-violet-300 mb-4">Evacuation Plan</h2>
      <div className="space-y-4 w-full">
        {zones.map(zone => (
          <div key={zone.id} className="w-full">
            <button
              className={`w-full flex justify-between items-center px-4 py-2 rounded-lg bg-violet-900/60 hover:bg-violet-800 text-left font-semibold text-violet-100 shadow transition-colors ${openZone === zone.id ? 'border-b-2 border-violet-400' : ''}`}
              onClick={() => setOpenZone(openZone === zone.id ? null : zone.id)}
            >
              <span>{ZONE_EVAC_GUIDELINES[zone.id]?.title || zone.id.toUpperCase()}</span>
              <span className="ml-2">{openZone === zone.id ? '▲' : '▼'}</span>
            </button>
            {openZone === zone.id && (
              <div className="bg-black/70 border-l-4 border-violet-500 mt-2 mb-4 px-4 py-3 rounded-lg animate-fade-in">
                <div className="mb-2 text-sm text-violet-200"><b>Guideline:</b> {ZONE_EVAC_GUIDELINES[zone.id]?.guideline || 'Follow local emergency instructions.'}</div>
                {zoneCityMap[zone.id] && zoneCityMap[zone.id].length > 0 ? (
                  <table className="w-full text-xs text-left text-gray-200">
                    <thead>
                      <tr className="border-b border-violet-700">
                        <th className="py-1 px-2">Order</th>
                        <th className="py-1 px-2">City</th>
                        <th className="py-1 px-2">Distance (km)</th>
                        <th className="py-1 px-2">Population</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneCityMap[zone.id].map(city => (
                        <tr key={city.name + city.distance} className="border-b border-gray-800 hover:bg-violet-900/30">
                          <td className="py-1 px-2 font-bold text-orange-300">{city.order}</td>
                          <td className="py-1 px-2">{city.name}</td>
                          <td className="py-1 px-2">{city.distance.toFixed(1)}</td>
                          <td className="py-1 px-2">{city.population.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-400 text-xs italic">No cities affected in this zone.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImpactMap;