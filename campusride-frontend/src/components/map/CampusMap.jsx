import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Leaflet with Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// 1. Rider/Start Icon (Pulsing Green for Start, Red for Live)
export const StartIcon = L.divIcon({
    html: `<div style="background-color: #4caf50; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

export const RiderLiveIcon = L.divIcon({
    html: `<div style="background-color: #f44336; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); animation: pulse-red 2s infinite;"></div>`,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// 2. Pickup Icon (Blue Dot - Requirement)
export const PickupIcon = L.divIcon({
    html: `<div style="background-color: #2196f3; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

// 3. End Icon (Red Dot - Requirement)
export const EndIcon = L.divIcon({
    html: `<div style="background-color: #f44336; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

// 4. Passenger Icon (Pulsing Yellow - Requirement)
export const PassengerLiveIcon = L.divIcon({
    html: `<div style="background-color: #ffc107; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); animation: pulse-yellow 2s infinite;"></div>`,
    className: 'custom-div-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

// 5. User Tracking Icon (Blue Pulsing Blue Dot with Navigation Arrow)
export const createUserLocationIcon = (heading) => L.divIcon({
    className: 'custom-div-icon',
    html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="
                background-color: #2196f3;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 15px rgba(33, 150, 243, 0.8);
                animation: user-pulse 2s infinite;
                position: relative;
                z-index: 2;
            "></div>
            ${heading !== null && heading !== undefined ? `
                <div style="
                    position: absolute;
                    top: -10px;
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 12px solid #2196f3;
                    transform: rotate(${heading}deg);
                    transform-origin: 50% 22px;
                    z-index: 1;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                "></div>
            ` : ''}
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const MapInteractionHandler = ({ onLocationSelect, onZoom }) => {
    useMapEvents({
        click(e) {
            if (onLocationSelect) onLocationSelect(e.latlng);
        },
        zoomend() {
            if (onZoom) onZoom();
        }
    });
    return null;
}

const RecenterMap = ({ center, zoom }) => {
    const map = useMapEvents({})
    useEffect(() => {
        if (center) {
            map.setView(center, zoom || map.getZoom(), { animate: true })
        }
    }, [center, zoom, map])
    return null
}

const CampusMap = ({
    center = [29.9676, 77.5511],
    zoom = 13,
    markers = [],
    polyline = null,
    aiPolyline = null,
    draftPolyline = null,
    alternativePolylines = [],
    onMapClick = null,
    onZoom = null,
    style = { height: '400px', width: '100%' }
}) => {
    return (
        <MapContainer center={center} zoom={zoom} style={style} worldCopyJump={true}>
            <RecenterMap center={center} zoom={zoom} />
            <TileLayer
                attribution='&copy; Google Maps'
                url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                maxZoom={21}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            />

            {/* Draw the main route */}
            {polyline && polyline.length > 0 && (
                <Polyline 
                    positions={polyline} 
                    color="#1976d2" 
                    weight={5} 
                    opacity={0.8}
                />
            )}

            {/* Draw AI suggested route (green dashed) */}
            {aiPolyline && aiPolyline.length > 0 && (
                <Polyline 
                    positions={aiPolyline} 
                    color="#4caf50" 
                    weight={5} 
                    opacity={0.7}
                    dashArray="10, 10"
                />
            )}

            {/* Draw draft polyline (grey dashed, connecting custom waypoints) */}
            {draftPolyline && draftPolyline.length > 0 && (
                <Polyline 
                    positions={draftPolyline} 
                    color="#9e9e9e" 
                    weight={3} 
                    opacity={0.6}
                    dashArray="8, 8"
                />
            )}

            {/* Draw alternative route suggestions (orange, thinner) */}
            {alternativePolylines && alternativePolylines.map((altPath, idx) => (
                altPath && altPath.length > 0 && (
                    <Polyline 
                        key={`alt-${idx}`}
                        positions={altPath} 
                        color="#ff9800" 
                        weight={4} 
                        opacity={0.5}
                        dashArray="6, 6"
                    />
                )
            ))}

            {markers.map((marker, index) => {
                // Stabilize the icon to prevent Leaflet flickering on every render
                let iconToUse = marker.icon || DefaultIcon;
                
                if (marker.icon === 'USER_LOCATION') {
                    // We only want to recreate the icon if the heading actually changed
                    // For now, we'll use a stable hash or just direct call if heading is identical
                    iconToUse = createUserLocationIcon(marker.heading);
                }

                return (
                    <Marker 
                        key={marker.id || index} 
                        position={marker.position} 
                        icon={iconToUse}
                        zIndexOffset={marker.icon === 'USER_LOCATION' || marker.icon === RiderLiveIcon || marker.icon === PassengerLiveIcon ? 1000 : 0}
                    >
                        {marker.popup && <Popup>{marker.popup}</Popup>}
                    </Marker>
                );
            })}

            {/* Accuracy Circle */}
            {markers.filter(m => m.icon === 'USER_LOCATION' && m.accuracy).map((m, i) => (
                <Circle 
                    key={`acc-${i}`}
                    center={m.position}
                    radius={m.accuracy}
                    pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.1, weight: 1 }}
                />
            ))}

            {/* Interaction Handler (Clicks & Zooms) */}
            <MapInteractionHandler onLocationSelect={onMapClick} onZoom={onZoom} />

            <style>
                {`
                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(244, 67, 54, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
                }
                @keyframes pulse-green {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
                @keyframes pulse-blue {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
                }
                @keyframes pulse-yellow {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(255, 193, 7, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
                }
                @keyframes user-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(33, 150, 243, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
                }
                .custom-div-icon {
                    background: none;
                    border: none;
                    transition: all 5s linear; /* Matches the 5s sync interval for smooth sliding */
                }
                `}
            </style>
        </MapContainer>
    )
}

export default CampusMap
