import React, { useState } from 'react';
import MapView from './MapView';
import Sidebar from './Sidebar';
import FloatingActions from './FloatingActions';
import AlertBanner from './AlertBanner';
import '../styles/theme.css'; // Global styles for this page

const MapPage: React.FC = () => {
  const [is3DMode, setIs3DMode] = useState(false); // Default to flat map as requested

  return (
    <section className="hero-map-section">
      <AlertBanner />
      <Sidebar />
      <MapView is3DMode={is3DMode} />
      <FloatingActions is3DMode={is3DMode} toggle3D={() => setIs3DMode(!is3DMode)} />
    </section>
  );
};

export default MapPage;
