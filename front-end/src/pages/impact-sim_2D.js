// src/pages/SimulateImpact.jsx
import Navbar from '../components/navbar';
import ImpactMap from '../components/ImpactMap.jsx';

function SimulateImpact2D() {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex bg-black overflow-hidden">
        {/* Left: Three.js */}
        <div className="flex-1 relative">
          <ImpactMap className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    </div>
  );
}

export default SimulateImpact2D;