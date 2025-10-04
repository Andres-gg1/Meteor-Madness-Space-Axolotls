import axolotl from '../assets/axolotl.png';
import { Github } from 'lucide-react';


function Navbar() {

    const handleClickOrbit = () => {
        console.log('Orbit clicked!');
    };

    const handleClickImpact = () => {
        console.log('Impact clicked!');
    };

    return (
      <div className='bg-indigo-800 h-28 flex flex-row justify-between items-center px-4'>
        {/* top bar */}
        <div className='flex flex-row items-center gap-4'>
          <img src={axolotl} className='h-28 w-auto mt-8' alt="Axolotl"/>
          <p className='text-6xl text-white font-bebas'>Space Axolotls</p>
        </div>
        <div className='flex gap-4'>
          <button onClick={handleClickOrbit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg transition duration-300 shadow-lg hover:shadow-xl">
            Orbit Viewer
          </button>
          
          <button onClick={handleClickImpact} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg transition duration-300 shadow-lg hover:shadow-xl">
            Impact Simulation
          </button>

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