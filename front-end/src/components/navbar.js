import axolotl from '../assets/axolotl.png';
import { Link, useLocation } from 'react-router-dom';
import { Github } from 'lucide-react';



function Navbar() {
  const location = useLocation();

  const isOrbitViewer = location.pathname === '/watch';
  const isImpactSim = location.pathname === '/simulate';


    return (
      <div className='bg-indigo-800 h-28 flex flex-row justify-between items-center px-4'>
        {/* top bar */}
        <div className='flex flex-row items-center gap-4'>
          <Link to='/'>
            <img src={axolotl} className='h-28 w-auto mt-8' alt="Axolotl"/>
          </Link>
          <p className='text-6xl text-white font-bebas'>Space Axolotls</p>
        </div>
        <div className='flex gap-4'>
          <Link 
              to="/watch"
              onClick={(e) => isOrbitViewer && e.preventDefault()}
              className={`bg-white text-indigo-800 font-bold px-6 py-2 rounded-lg transition duration-300 
                ${isOrbitViewer ? 'opacity-50 cursor-default pointer-events-none' : 'hover:bg-gray-100'}`}
            >
            Orbit Viewer
          </Link>
            
            <Link 
            to="/simulate"
            onClick={(e) => isImpactSim && e.preventDefault()}
              className={`bg-white text-indigo-800 font-bold px-6 py-2 rounded-lg transition duration-300 
                ${isImpactSim ? 'opacity-50 cursor-default pointer-events-none' : 'hover:bg-gray-100'}`}
            >
            Impact Simulation
          </Link>

          <a 
            href="https://github.com/gonrfernando/Meteor-Madness-Space-Axolotls" 
            target="_blank"
            rel="noopener noreferrer"
            className=" bg-lime-600 flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-indigo-800 px-4 py-2 rounded-lg transition duration-300"
            >
            <Github size={20}/>
          </a>

        </div>
      </div>  
    );

}

export default Navbar;