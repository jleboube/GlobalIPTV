import React, { useEffect, useState, useRef, useCallback } from 'react';
// @ts-ignore - react-globe.gl types can be tricky
import Globe, { GlobeMethods } from 'react-globe.gl';
import { GeoCountry } from '../types';
import { fetchCountries } from '../services/iptvService';

interface GlobeViewerProps {
  onCountryClick: (country: GeoCountry) => void;
}

const GlobeViewer: React.FC<GlobeViewerProps> = ({ onCountryClick }) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchCountries();
      setCountries(data);
    };
    loadData();

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGlobeReady = useCallback(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, []);

  const handleCountryClick = useCallback((country: object) => {
      // The globe returns the data object associated with the point
      const geoCountry = country as GeoCountry;
      onCountryClick(geoCountry);
      
      if (globeEl.current) {
        globeEl.current.pointOfView({
          lat: geoCountry.lat,
          lng: geoCountry.lng,
          altitude: 1.5
        }, 1000);
      }
  }, [onCountryClick]);

  return (
    <div className="absolute inset-0 z-0 bg-black">
       <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onGlobeReady={handleGlobeReady}

        // Points/Labels for Countries
        labelsData={countries}
        labelLat={(d: object) => (d as GeoCountry).lat}
        labelLng={(d: object) => (d as GeoCountry).lng}
        labelText={(d: object) => (d as GeoCountry).name}
        labelSize={1.5}
        labelDotRadius={0.5}
        labelColor={() => 'rgba(255, 165, 0, 0.75)'}
        labelResolution={2}
        onLabelClick={handleCountryClick}

        // Visual markers (cylinders) to indicate channel density
        objectsData={countries}
        objectLat={(d: object) => (d as GeoCountry).lat}
        objectLng={(d: object) => (d as GeoCountry).lng}
        objectAltitude={0.01}
        objectLabel={(d: object) => `${(d as GeoCountry).name}: ${(d as GeoCountry).channelCount}+ Channels`}
        onObjectClick={handleCountryClick}
      />
      
      <div className="absolute bottom-4 left-4 text-white/50 text-sm pointer-events-none z-10">
        Click a label or marker to explore channels.
      </div>
    </div>
  );
};

export default GlobeViewer;