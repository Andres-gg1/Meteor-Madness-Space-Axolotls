// src/pages/SimulateImpact.jsx
import { Link } from 'react-router-dom';
import Navbar from '../components/navbar';
import { Meteors } from '../components/animations/meteors';
import MeteorSimulation from '../components/component-impact-sim';

function SimulateImpact() {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex bg-black overflow-hidden">
        {/* Left: Three.js */}
        <div className="flex-1 relative">
          <MeteorSimulation className="absolute inset-0 w-full h-full" />
        </div>

        {/* Right: Info panel */}
        <div className="w-96 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-6xl font-bebas bg-gradient-to-b from-white to-purple-600 bg-clip-text text-transparent mb-4">
            SIMULATE IMPACT
          </h1>

          <p className="text-lg text-gray-300 mb-6 max-w-xs">
            Click on Earth to simulate asteroid impact trajectories
          </p>

          <Link 
            to="/" 
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition duration-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SimulateImpact;