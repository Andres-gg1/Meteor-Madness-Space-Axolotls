import axolotl from '../assets/axolotl.png';
import { Link, useLocation } from 'react-router-dom';
import { Github } from 'lucide-react';



function Navbar() {
  const location = useLocation();

  const isOrbitViewer = location.pathname === '/watch';
  const isImpactSim = location.pathname === '/simulate';


    return (
      <div className='bg-indigo-800 h-20 flex flex-row justify-between items-center px-4'>
        {/* top bar */}
        <div className='flex flex-row items-center gap-4'>
          <Link to='/'>
            <img src={axolotl} className='h-28 w-auto mt-8' alt="Axolotl"/>
          </Link>
          <p className='text-6xl text-white font-bebas mt-2'>Space Axolotls</p>
        </div>
        <div className='flex gap-4 items-center'>
          <Link 
              to="/watch"
              onClick={(e) => isOrbitViewer && e.preventDefault()}
              className={`flex items-center justify-center 
                          bg-gradient-to-br from-sky-400 to-blue-600 hover:opacity-70 text-xl font-bold px-6 rounded-lg transition duration-300 text-white 
                ${isOrbitViewer ? 'h-14 opacity-90 cursor-default pointer-events-none' : 'hover:bg-gray-100 h-10'}`}
            >
            Orbit Viewer
          </Link>
            
          <Link 
            to="/simulate"
            onClick={(e) => isImpactSim && e.preventDefault()}
            className={`flex items-center justify-center 
                        bg-gradient-to-tl from-sky-400 to-blue-600 hover:opacity-70 text-xl font-bold px-6 rounded-lg transition duration-300 text-white
              ${isImpactSim ? 'h-14 opacity-90 cursor-default pointer-events-none' : 'hover:bg-gray-100 h-10'}`}
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