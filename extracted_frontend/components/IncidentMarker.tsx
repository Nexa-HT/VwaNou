import React, { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { Incident } from '../types/Incident';

interface Props {
    incident: Incident;
}

const IncidentMarker: React.FC<Props> = ({ incident }) => {
    const [showPopup, setShowPopup] = useState(false);

    return (
        <>
            <Marker 
                longitude={incident.lng} 
                latitude={incident.lat} 
                anchor="bottom"
                onClick={e => {
                    e.originalEvent.stopPropagation();
                    setShowPopup(true);
                }}
            >
                <div style={{ cursor: 'pointer' }}>
                   <img src="/icons/incident.svg" alt="Incident" style={{width: 32, height: 32}} />
                </div>
            </Marker>

            {showPopup && (
                <Popup
                    longitude={incident.lng}
                    latitude={incident.lat}
                    anchor="top"
                    onClose={() => setShowPopup(false)}
                    closeOnClick={false}
                >
                    <strong>{incident.type}</strong>
                    <br />
                    {incident.description}
                </Popup>
            )}
        </>
    );
};

export default IncidentMarker;
