import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import WatchMeteorites from './pages/orbit-sim';
import SimulateImpact from './pages/impact-sim';
import ImpactMap from './components/ImpactMap.jsx';
import SimulateImpact2D from './pages/impact-sim_2D.js';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch" element={<WatchMeteorites />} />
        <Route path="/simulate" element={<SimulateImpact />} />
        <Route path="/impact-damage" element={<ImpactMap />} />
        <Route path="/simulate/impact-damage" element={<SimulateImpact2D />} />
      </Routes>
    </Router>
  );
}

export const URL = "http://127.0.0.1:5000";
export default App;