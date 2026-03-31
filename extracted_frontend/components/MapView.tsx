import React from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import IncidentMarker from './IncidentMarker';
import UserLocationMarker from './UserLocationMarker';
import ZonePolygon from './ZonePolygon';
import type { Incident } from '../types/Incident';
import type { Zone } from '../types/Zone';

// Clear, colorful tiles where the sea is blue and roads are visible
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// Dummy data for incidents
const dummyIncidents: Incident[] = [
    { id: '1', type: 'Aksidan', description: 'Aksidan machin sou wout prensipal la', lat: 18.55, lng: -72.3 },
    { id: '2', type: 'Manifestasyon', description: 'Gen yon gwo foul moun anba lavil la', lat: 18.58, lng: -72.33 },
];

const dummyZones: Zone[] = [
    {
        id: 'z1',
        name: 'Zòn Gwo Risk A',
        riskLevel: 'High',
        coordinates: [
            [18.565, -72.35],
            [18.57, -72.33],
            [18.55, -72.32],
            [18.54, -72.34],
        ],
    },
];

interface MapViewProps {
  is3DMode?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ is3DMode = true }) => {
    return (
        <div style={{ height: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
            <Map
                initialViewState={{
                    longitude: -72.3,
                    latitude: 18.55,
                    zoom: 12,
                    pitch: is3DMode ? 60 : 0,
                    bearing: is3DMode ? -20 : 0
                }}
                mapStyle={MAP_STYLE}
                mapLib={maplibregl as any}
                style={{ width: '100%', height: '100%' }}
            >
                <NavigationControl position="top-right" />

                {dummyZones.map(zone => (
                    <ZonePolygon key={zone.id} zone={zone} is3DMode={is3DMode} />
                ))}

                {dummyIncidents.map(incident => (
                    <IncidentMarker key={incident.id} incident={incident} />
                ))}

                <UserLocationMarker />
            </Map>
        </div>
    );
};

export default MapView;
