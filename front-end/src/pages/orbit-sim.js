import React, { useState, useEffect } from 'react';
import OrbitCanvas from '../components/orbit-canvas';
import Navbar from '../components/navbar';
import { Search } from 'lucide-react';

function OrbitSim() {
  const [asteroidId, setAsteroidId] = useState('');
  const [targetDate, setTargetDate] = useState('2025-12-25');
  const [orbitalData, setOrbitalData] = useState(null);
  const [asteroidDetails, setAsteroidDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [asteroids, setAsteroids] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Fetch asteroids (paginated)
  const fetchAsteroids = async (pageNumber = 0) => {
    setIsLoading(true);
    setError('');
    try {
      const url = `http://127.0.0.1:5000/api/asteroids?page=${pageNumber}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.asteroids && data.asteroids.length > 0) {
        setAsteroids(data.asteroids);
        setPage(data.page || pageNumber);
        setHasMore(data.asteroids.length === 20);
      } else {
        setAsteroids([]);
        setHasMore(false);
      }
    } catch (err) {
      setError('Error loading asteroids');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search asteroids
  const searchAsteroids = async () => {
    const query = search.trim();
    if (!query) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError('');
    setIsSearchMode(true);

    try {
      const url = `http://127.0.0.1:5000/api/asteroids/search?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setAsteroids([]);
      } else if (data.asteroids) {
        setAsteroids(data.asteroids);
        if (data.asteroids.length === 0) {
          setError('No asteroids found matching your search');
        }
      }
    } catch (err) {
      setError('Error searching asteroids');
      console.error(err);
      setAsteroids([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch('');
    setIsSearchMode(false);
    setError('');
    setAsteroidId('');
    fetchAsteroids(0);
  };

  // Fetch orbital data
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!asteroidId) {
      setError('Please select an asteroid');
      return;
    }

    setIsLoading(true);
    setError('');
    setOrbitalData(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/orbital-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asteroid_id: asteroidId, target_date: targetDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'A server error occurred.');
      }

      const data = await response.json();
      setOrbitalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch asteroid details
  const fetchAsteroidDetails = async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:5000/api/asteroid-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asteroid_id: id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error fetching asteroid details');
      }

      const data = await response.json();
      setAsteroidDetails(data);
    } catch (err) {
      setError(err.message);
      setAsteroidDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load details when asteroidId changes
  useEffect(() => {
    if (asteroidId) {
      fetchAsteroidDetails(asteroidId);
    } else {
      setAsteroidDetails(null);
    }
  }, [asteroidId]);

  // Load initial asteroids
  useEffect(() => {
    fetchAsteroids(0);
  }, []);

  return (
    <div className="bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] min-h-screen font-sans text-[#e0e0e0]">
      <Navbar />

      <div className="flex flex-col lg:flex-row justify-center items-start gap-8 px-6 py-10 min-h-screen">
        {/* Left Panel */}
        <div className="flex-1 bg-[#111118] rounded-3xl shadow-2xl relative flex flex-col items-center justify-center h-screen overflow-hidden">
          {isLoading && !orbitalData && (
            <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          )}
          {error && !orbitalData && (
            <p className="text-red-400 text-center font-semibold text-lg mb-4 px-4">{error}</p>
          )}
          {orbitalData && (
            <>
              <OrbitCanvas orbitalData={orbitalData} className="w-full h-full" />
              <div className="absolute top-4 left-4 bg-[#1c1c29] bg-opacity-90 rounded-xl p-3 shadow-lg text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span> Sun
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 bg-cyan-400 rounded-full inline-block"></span> Orbit of {orbitalData.asteroid_name}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full inline-block"></span> Earth Orbit
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span> Position on {targetDate}
                </div>
              </div>
            </>
          )}
          {!orbitalData && !isLoading && !error && (
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">Select an asteroid and date</p>
              <p className="text-sm">to visualize its orbit</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 max-w-md w-full bg-[#111118] rounded-3xl shadow-2xl p-8 flex flex-col gap-6">
          <h1 className="text-center text-5xl font-extrabold text-purple-400 mb-6 tracking-wide">
            Orbit Visualizer
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="font-semibold text-gray-300">Select Asteroid:</label>
            
            {/* Search bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchAsteroids()}
                className="flex-1 px-3 py-2 rounded-md bg-[#1e1e1e] border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={searchAsteroids}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors flex items-center justify-center"
                title="Search"
              >
                <Search size={20} />
              </button>
            </div>

            {isSearchMode && (
              <div className="flex items-center justify-between text-sm text-gray-400 -mt-2">
                <span>Showing search results</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Asteroid list */}
            <ul className="border border-gray-700 rounded-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-900">
              {asteroids.length === 0 && !isLoading ? (
                <li className="px-4 py-8 text-center text-gray-500">
                  {isSearchMode ? 'No results found' : 'No asteroids available'}
                </li>
              ) : (
                asteroids.map((a) => (
                  <li
                    key={a.id}
                    onClick={() => setAsteroidId(a.id)}
                    className={`cursor-pointer px-4 py-2 mb-1 rounded-lg transition-all
                      ${asteroidId === a.id ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-[#1e1e1e] text-gray-200 hover:bg-gray-800 hover:scale-105'}`}
                  >
                    <span className="font-semibold">{a.name}</span>
                    <span className="ml-2 text-sm text-gray-400">({a.id})</span>
                  </li>
                ))
              )}
            </ul>

            {!isSearchMode && (
              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={() => fetchAsteroids(Math.max(0, page - 1))}
                  disabled={page === 0 || isLoading}
                  className="bg-gray-700 px-4 py-2 rounded text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400 flex items-center">Page {page + 1}</span>
                <button
                  type="button"
                  onClick={() => hasMore && fetchAsteroids(page + 1)}
                  disabled={!hasMore || isLoading}
                  className="bg-gray-700 px-4 py-2 rounded text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            <label className="font-semibold text-gray-300 mt-4">Target Date:</label>
            <input
              type="date"
              id="target_date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="p-3 rounded-xl border border-[#333] bg-[#1c1c29] text-white text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <button
              type="submit"
              disabled={isLoading || !asteroidId}
              className={`py-4 rounded-xl text-white text-lg font-semibold transition-colors
                ${isLoading || !asteroidId ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-800 cursor-pointer'}`}
            >
              {isLoading ? 'Generating...' : 'Generate Plot'}
            </button>
          </form>

          {/* Asteroid Details Dashboard */}
          {asteroidDetails && (
            <div className="mt-6 bg-[#1c1c29] rounded-2xl p-4 shadow-lg text-gray-300 text-sm">
              <h2 className="text-lg font-semibold text-purple-400 mb-2">Asteroid Details</h2>
              <div className="space-y-1">
                <p><span className="font-semibold">Name:</span> {asteroidDetails.name}</p>
                <p><span className="font-semibold">Designation:</span> {asteroidDetails.designation}</p>
                <p><span className="font-semibold">Absolute Magnitude (H):</span> {asteroidDetails.absolute_magnitude_h} mag</p>
                <p>
                  <span className="font-semibold">Estimated Diameter:</span> 
                  {` ${asteroidDetails.estimated_diameter.estimated_diameter_min.toFixed(2)} m - ${asteroidDetails.estimated_diameter.estimated_diameter_max.toFixed(2)} m 
                    (avg: ${asteroidDetails.estimated_diameter.estimated_diameter_avg.toFixed(2)} m)`}
                </p>
                <p>
                  <span className="font-semibold">Potentially Hazardous:</span> 
                  {asteroidDetails.is_potentially_hazardous ? ' Yes' : ' No'}
                </p>
                <p>
                  <span className="font-semibold">NASA JPL URL:</span> 
                  <a href={asteroidDetails.nasa_jpl_url} target="_blank" className="text-purple-300 underline">Link</a>
                </p>
                <p>
                  <span className="font-semibold">Estimated Density:</span> {asteroidDetails.density.toFixed(2)} kg/m³ 
                  <span className="text-gray-400 text-xs ml-1">(Based on albedo & taxonomic type, approximate)</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrbitSim;
