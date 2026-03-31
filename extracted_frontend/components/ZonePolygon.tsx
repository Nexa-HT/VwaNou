import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { Zone } from '../types/Zone';
import type { FillLayer, FillExtrusionLayer } from 'react-map-gl';

interface Props {
    zone: Zone;
    is3DMode?: boolean;
}

const riskLevelMap: Record<string, string> = {
    High: 'Wo',
    Medium: 'Mwayen',
    Low: 'Fèb',
    Critical: 'Kritik'
};

const ZonePolygon: React.FC<Props> = ({ zone, is3DMode = true }) => {
    // Map Leaflet [lat, lng] to GeoJSON [lng, lat]
    const geojson = useMemo(() => {
        const coords = zone.coordinates.map(coord => [coord[1], coord[0]]);
        if (coords.length > 0) {
            coords.push([...coords[0]]); // close polygon
        }
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: zone.name,
                        riskLevel: riskLevelMap[zone.riskLevel] || zone.riskLevel
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coords]
                    }
                }
            ]
        };
    }, [zone]);

    const fillStyle: FillLayer = {
        id: `zone-fill-${zone.id}`,
        type: 'fill',
        paint: {
            'fill-color': '#e53e3e',
            'fill-opacity': 0.2
        }
    };
    
    // Extrusion 3D Layer to show risk as a physical blocking wall
    const extrusionStyle: FillExtrusionLayer = {
        id: `zone-extrusion-${zone.id}`,
        type: 'fill-extrusion',
        paint: {
            'fill-extrusion-color': '#e53e3e',
            'fill-extrusion-opacity': 0.3,
            'fill-extrusion-height': 50 // 50m tall wall to indicate danger
        }
    };

    return (
        <Source id={`zone-source-${zone.id}`} type="geojson" data={geojson as any}>
            {is3DMode ? <Layer {...extrusionStyle} /> : <Layer {...fillStyle} />}
        </Source>
    );
};

export default ZonePolygon;
