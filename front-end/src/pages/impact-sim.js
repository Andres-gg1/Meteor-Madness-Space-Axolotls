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
      </div>
    </div>
  );
}

export default SimulateImpact;