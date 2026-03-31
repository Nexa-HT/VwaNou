import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fading out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Completely remove from DOM after 3 seconds (1s for fade animation)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`splash-screen ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <h1 className="splash-logo pulse-animation">
          Vwa<span>Nou</span>
        </h1>
        <p className="splash-subtitle slide-up-animation">
          Transparans, Sekirite, Inite.
        </p>
      </div>
      <div className="splash-loader"></div>
    </div>
  );
};

export default SplashScreen;
