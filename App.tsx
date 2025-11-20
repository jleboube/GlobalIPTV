import React, { useState } from 'react';
import GlobeViewer from './components/GlobeViewer';
import Sidebar from './components/Sidebar';
import { GeoCountry } from './types';

function App() {
  const [selectedCountry, setSelectedCountry] = useState<GeoCountry | null>(null);

  const handleCountryClick = (country: GeoCountry) => {
    setSelectedCountry(country);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GlobeViewer onCountryClick={handleCountryClick} />
      
      {/* Overlay UI */}
      <Sidebar 
        selectedCountry={selectedCountry} 
        onClose={() => setSelectedCountry(null)} 
      />

      {/* API Key Notice */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none z-20">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
        <span className="text-xs text-white/50 font-mono">SYSTEM ONLINE</span>
      </div>
    </div>
  );
}

export default App;