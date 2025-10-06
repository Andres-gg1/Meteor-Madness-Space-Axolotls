import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import WatchMeteorites from './pages/orbit-sim';
import SimulateImpact from './pages/impact-sim';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch" element={<WatchMeteorites />} />
        <Route path="/simulate" element={<SimulateImpact />} />
        <Route path="/simulate/impact-damage" element={<ImpactDamage />} />
      </Routes>
    </Router>
  );
}

export default App;