import Navbar from "../components/navbar";
import { Meteors } from '../components/animations/meteors';
import  meteorite  from '../assets/meteorite-2.png';
import meteorImpact from '../assets/meteor-impact.jpeg';
import orbitSim from '../assets/orbit-simulation.jpeg';
import { Link } from 'react-router-dom';

function Home() {

  const teamMembers = [
  { name: "Andres Garcia", avatar: "👨‍🚀" },
  { name: "Zahid Aguirre", avatar: "👩‍💻" },
  { name: "Fernando Gonzalez", avatar: "👨‍🔬" },
  { name: "Angel Reynoso", avatar: "👩‍🚀" },
  { name: "Itzel Ximena", avatar: "👩‍🚀" },
  { name: "Alvaro Nuñez", avatar: "👩‍🚀" },
];

  return (
    <div className='min-h-screen flex flex-col'>
      <Navbar/>

      <div className="bg-black flex-1 relative overflow-hidden">
        <div className="relative flex h-full w-full flex-col items-center justify-center rounded-lg">
          <Meteors number={60} className='overflow-hidden'/>
          <div className="relative z-10 flex h-full gap-20 items-center">
            {/* Left Column */}
            <div className="flex-1 flex-col items-center justify-center self-baseline ml-14 mt-14 pl-14 mb-6">
              <span className="pointer-events-none bg-gradient-to-b from-white to-indigo-800 bg-clip-text text-center text-9xl leading-none font-bebas whitespace-pre-wrap text-transparent">
                METEOR
                <br />
                MADNESS
              </span>
              <p className="text-4xl font-bebas text-gray-300"> Interactive 3D simulator that models<br/> 
                <span className=" text-5xl font-black underline "> asteroid trajectories and impact scenarios</span>&nbsp;  
                 using real NASA data. Visualize consequences and explore mitigation strategies.
              </p>
            </div>
            
            {/* Right Column */}
            <div className="flex-1 flex items-center justify-center">
              <img 
                src={meteorite} 
                alt="Meteor image" 
                className="w-auto -rotate-19 object-contain rounded-lg justify-center align-center items-center content-center pr-[5rem] mr-[5rem]"
              />
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="relative z-10 flex items-center justify-center px-8 pb-12">
          <div className="rounded-3xl border-2 border-transparent bg-gradient-to-br from-white to-indigo-600 p-1 max-w-5xl">
            <div className="bg-black rounded-2xl p-8">
              <h2 className="text-4xl font-bebas text-center mb-8 bg-gradient-to-b from-white to-indigo-600 bg-clip-text text-transparent">
                THE TEAM
              </h2>
              
              <div className="grid grid-cols-2 gap-12">
                {teamMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="flex flex-row items-center text-center gap-4"
                  >
                    <div className="text-4xl bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center">
                      {member.avatar}
                    </div>
                    <h3 className="text-white font-semibold text-2xl">
                      {member.name}
                    </h3>
                  </div>
                ))}
                <div/>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="mt-8 flex flex-row w-full h-[24rem] gap-6 px-20 pb-20">
          {/* Simulate Impact Card */}
          <Link
            to="/simulate"
            className="relative h-full w-full rounded-3xl overflow-hidden group hover:scale-[1.02] transition duration-300 cursor-pointer 
                      hover:shadow-[0_0_50px_20px_rgba(99,102,241,0.7)]"
          >
            <img 
              src={meteorImpact} 
              alt="Meteor background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition duration-300"></div>
            <div className="absolute bottom-6 right-6 text-right z-10">
              <span className="pointer-events-none bg-gradient-to-b from-white to-stone-400 bg-clip-text text-7xl leading-none font-bebas whitespace-pre-wrap text-transparent drop-shadow-lg">
                SIMULATE
                <br/>
                IMPACT
              </span>
            </div>
          </Link>

          {/* Watch Meteorites Card */}
          <Link
            to="/watch"
            className="relative h-full w-full rounded-3xl overflow-hidden group hover:scale-[1.02] transition duration-300 cursor-pointer 
                      hover:shadow-[0_0_50px_20px_rgba(139,92,246,0.7)]"
          >
            <img 
              src={orbitSim} 
              alt="Impact background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition duration-300"></div>
            <div className="absolute bottom-6 right-6 text-right z-10">
              <span className="pointer-events-none bg-gradient-to-b from-white to-stone-400 bg-clip-text text-7xl leading-none font-bebas whitespace-pre-wrap text-transparent drop-shadow-lg">
                WATCH
                <br/>
                METEORITES
              </span>
            </div>
          </Link>
        </div>
      </div>  
    </div>
  );
}

export default Home;