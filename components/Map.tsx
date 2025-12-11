import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Marker, useMapEvents, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import { Coordinate } from '../types';

// Fix for default Leaflet marker icons not showing in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for the draggable vertex (looks like a circle)
const createVertexIcon = (isDragging: boolean) => L.divIcon({
  className: '', // Remove default class
  html: `<div style="
    width: 12px; 
    height: 12px; 
    background-color: ${isDragging ? '#3b82f6' : '#ef4444'}; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface MapProps {
  points: Coordinate[];
  setPoints: (points: Coordinate[]) => void;
  isDrawing: boolean;
  onPolygonComplete: () => void;
}

const MapEvents = ({ isDrawing, points, setPoints, onPolygonComplete }: MapProps) => {
  const map = useMap();
  
  // Custom cursor logic
  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = 'grab';
    }
  }, [isDrawing, map]);

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPoints([...points, newPoint]);
    },
    // Right click to close polygon if we have enough points
    contextmenu(e) {
      if (isDrawing && points.length >= 3) {
        onPolygonComplete();
      }
    }
  });
  return null;
};

interface DraggableVertexProps {
  position: Coordinate;
  index: number;
  onDrag: (index: number, newPos: Coordinate) => void;
}

// Component to handle dragging vertices
const DraggableVertex: React.FC<DraggableVertexProps> = ({ 
  position, 
  index, 
  onDrag 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const eventHandlers = useMemo(
    () => ({
      dragstart() {
        setIsDragging(true);
      },
      dragend(e: any) {
        setIsDragging(false);
        const marker = e.target;
        const pos = marker.getLatLng();
        onDrag(index, { lat: pos.lat, lng: pos.lng });
      },
      drag(e: any) {
        // Optional: Update position visually during drag if needed, 
        // but react-leaflet Marker handles its own visual state well enough.
      },
    }),
    [index, onDrag]
  );

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={createVertexIcon(isDragging)}
      zIndexOffset={1000} // Keep vertices on top
    />
  );
};

const InteractiveMap: React.FC<MapProps> = (props) => {
  const { points, setPoints, isDrawing } = props;

  const handleVertexDrag = (index: number, newPos: Coordinate) => {
    const newPoints = [...points];
    newPoints[index] = newPos;
    setPoints(newPoints);
  };

  // Alun-Alun Situbondo coordinates
  const center: [number, number] = points.length > 0 ? [points[0].lat, points[0].lng] : [-7.7014, 114.0048]; 

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full"
        attributionControl={false}
      >
        {/* Google Hybrid Tile Layer - UPDATED TO HTTPS */}
        <TileLayer
          url="https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
          maxZoom={22}
        />
        
        <MapEvents {...props} />

        {/* Use LayerGroup to ensure children are properly managed during updates */}
        <LayerGroup>
          {/* The Polygon */}
          {points.length > 0 && (
            <Polygon
              positions={points.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: isDrawing ? '#fbbf24' : '#3b82f6', 
                fillColor: isDrawing ? '#fbbf24' : '#3b82f6',
                fillOpacity: 0.4,
                weight: 3
              }}
            />
          )}

          {/* Vertices (Only show when not drawing for editing) */}
          {!isDrawing && points.map((p, idx) => (
            <DraggableVertex 
              // CRITICAL: Use index as key. Using lat/lng causes remount on drag, killing the drag action.
              key={idx} 
              position={p} 
              index={idx} 
              onDrag={handleVertexDrag} 
            />
          ))}
          
          {/* Drawing Preview Vertices (Static) */}
          {isDrawing && points.map((p, idx) => (
              <CircleMarker 
                  key={idx}
                  center={[p.lat, p.lng]} 
                  radius={4}
                  pathOptions={{ color: 'white', fillColor: '#fbbf24', fillOpacity: 1, weight: 1 }}
              />
          ))}

          {/* Start Point Marker to help close loop visually */}
          {isDrawing && points.length > 2 && (
               <CircleMarker 
               center={[points[0].lat, points[0].lng]} 
               radius={8}
               pathOptions={{ color: '#10b981', fillColor: 'transparent', weight: 2, dashArray: '4' }}
           />
          )}
        </LayerGroup>

      </MapContainer>
      
      {/* Attribution Overlay */}
      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-2 py-1 rounded pointer-events-none z-[400]">
        Imagery ©2024 Google, Map data ©2024 Google
      </div>
    </div>
  );
};

export default InteractiveMap;