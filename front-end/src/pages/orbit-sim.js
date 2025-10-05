import React, { useState } from 'react';
import OrbitCanvas from '../components/orbit-canvas';
import Navbar from '../components/navbar';

const Legend = ({ asteroidName, targetDate }) => (
  <div className="absolute top-2 left-2 bg-[rgba(30,30,30,0.8)] p-2 rounded text-white text-xs z-10">
    <ul className="list-none p-0 m-0">
      <li className="flex items-center mb-1">
        <span className="w-3 h-3 mr-2 inline-block border border-gray-600" style={{ backgroundColor: 'yellow' }}></span>
        Sun
      </li>
      <li className="flex items-center mb-1">
        <span className="w-3 h-3 mr-2 inline-block border border-gray-600" style={{ backgroundColor: '#00ffff' }}></span>
        Orbit of {asteroidName}
      </li>
      <li className="flex items-center mb-1">
        <span className="w-3 h-3 mr-2 inline-block border border-gray-600" style={{ backgroundColor: 'dodgerblue' }}></span>
        Earth Orbit (approx.)
      </li>
      <li className="flex items-center">
        <span className="w-3 h-3 mr-2 inline-block border border-gray-600" style={{ backgroundColor: 'red' }}></span>
        Position on {targetDate}
      </li>
    </ul>
  </div>
);

function OrbitSim() {
  const [asteroidId, setAsteroidId] = useState('2000433');
  const [targetDate, setTargetDate] = useState('2025-12-25');
  const [orbitalData, setOrbitalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setOrbitalData(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/orbital-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asteroid_id: asteroidId,
          target_date: targetDate,
        }),
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

  return (
    <div>
        <Navbar/>
        <div className="min-h-screen flex flex-row justify-center bg-[#121212] text-[#e0e0e0] font-sans p-5 ">
                
            <div className="w-full flex-2 h-auto mt-0 bg-black rounded relative flex flex-col items-center justify-center m-[2rem] ">
                {isLoading && (
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin m-5"></div>
                )}
                {error && <p className="text-red-500 text-center font-bold">{error}</p>}
                {orbitalData && (
                    <>
                    <Legend asteroidName={orbitalData.asteroid_name} targetDate={targetDate} />
                    <OrbitCanvas orbitalData={orbitalData} />
                    </>
                )}
            </div>

            <div className='w-full flex-1 m-[3rem]'>
                <h1 className="text-center text-white text-6xl mb-6 font-bebas">Orbit Visualizer</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
                <label htmlFor="asteroid_id" className="font-semibold">
                    Asteroid ID:
                </label>
                <input
                    type="text"
                    id="asteroid_id"
                    value={asteroidId}
                    onChange={(e) => setAsteroidId(e.target.value)}
                    required
                    className="p-2 rounded border border-[#333] bg-[#2c2c2c] text-[#e0e0e0] text-base"
                />

                <label htmlFor="target_date" className="font-semibold">
                    Target Date:
                </label>
                <input
                    type="date"
                    id="target_date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                    className="p-2 rounded border border-[#333] bg-[#2c2c2c] text-[#e0e0e0] text-base"
                />

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`py-3 rounded text-white text-lg font-semibold transition-colors 
                    ${isLoading
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-800 cursor-pointer'}`}
                >
                    {isLoading ? 'Generating...' : 'Generate Plot'}
                </button>
                </form>
                <h1 className='underline color-blue'>
                    <a href='https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/'>
                    NASA API to check Asteroid IDs
                    </a>
                </h1>
            </div>


        </div>
    </div>
    
  );
}

export default OrbitSim;
