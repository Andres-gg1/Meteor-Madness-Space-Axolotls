import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import WatchMeteorites from './pages/orbit-sim';
import SimulateImpact from './pages/impact-sim';
import ImpactMap from './components/ImpactMap.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch" element={<WatchMeteorites />} />
        <Route path="/simulate" element={<SimulateImpact />} />
        <Route path="/impact-damage" element={<ImpactMap />} />
=======
        <Route path="/simulate/impact-damage" element={<ImpactDamage />} />
>>>>>>> 81f613b383a2e34f231b97800063f03be0727e4b
      </Routes>
    </Router>
  );
}

export default App;