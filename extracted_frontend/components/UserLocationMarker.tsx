import React, { useEffect, useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';

const UserLocationMarker: React.FC = () => {
    const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by your browser');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition({lat: pos.coords.latitude, lng: pos.coords.longitude});
            },
            (err) => {
                console.error('Error fetching user location:', err);
            },
            {
                enableHighAccuracy: true,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    if (!position) return null;

    return (
        <Marker longitude={position.lng} latitude={position.lat} anchor="center">
            <div className="user-marker-container">
                 <img src="/icons/user-dot.svg" alt="Pozisyon Ou" style={{width: 24, height: 24}} />
            </div>
        </Marker>
    );
};

export default UserLocationMarker;
