// src/pages/SimulateImpact.jsx
import { Link } from 'react-router-dom';
import Navbar from '../components/navbar';
import { Meteors } from '../components/animations/meteors';
import MeteorSimulation from '../components/component-impact-sim';

function SimulateImpact() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Navbar/>
      
      <div className="bg-black flex-1 relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <Meteors number={20} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center p-8 h-full">
          <h1 className="text-6xl font-bebas bg-gradient-to-b from-white to-purple-600 bg-clip-text text-transparent mb-4">
            SIMULATE IMPACT
          </h1>
          
          <p className="text-lg text-gray-300 mb-6 max-w-2xl text-center">
            Click on Earth to simulate asteroid impact trajectories
          </p>
          
          {/* Three.js Component */}
          <div className="w-full h-[80vh]">
            <MeteorSimulation />
          </div>
          
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