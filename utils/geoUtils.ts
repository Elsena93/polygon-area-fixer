import * as turf from '@turf/turf';
import { Coordinate } from '../types';

// Convert our Coordinate type to a GeoJSON Polygon Position array
const toTurfPolygon = (points: Coordinate[]) => {
  if (points.length < 3) return null;
  // Close the ring if not closed
  const coordinates = points.map(p => [p.lng, p.lat]);
  if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
    coordinates.push(coordinates[0]);
  }
  return turf.polygon([coordinates]);
};

export const calculateArea = (points: Coordinate[]): number => {
  const polygon = toTurfPolygon(points);
  if (!polygon) return 0;
  return turf.area(polygon); // Returns area in square meters
};

export const scalePolygonToArea = (points: Coordinate[], targetAreaSqM: number): Coordinate[] => {
  const currentArea = calculateArea(points);
  if (currentArea === 0 || targetAreaSqM <= 0) return points;

  const polygon = toTurfPolygon(points);
  if (!polygon) return points;

  // Calculate scale factor: Area scales with square of linear dimension
  // target = current * factor^2  =>  factor = sqrt(target / current)
  const factor = Math.sqrt(targetAreaSqM / currentArea);
  
  const centroid = turf.centroid(polygon);
  const scaled = turf.transformScale(polygon, factor, { origin: centroid });
  
  // Convert back to Coordinate objects
  // scaled.geometry.coordinates is [[[lng, lat], ...]]
  const newCoords = scaled.geometry.coordinates[0].map((c: any) => ({
    lng: c[0],
    lat: c[1]
  }));

  // Remove the last closing point to keep our internal state clean (Leaflet handles closing)
  if (newCoords.length > 0 && 
      newCoords[0].lng === newCoords[newCoords.length - 1].lng &&
      newCoords[0].lat === newCoords[newCoords.length - 1].lat) {
      newCoords.pop();
  }

  return newCoords;
};

export const formatArea = (sqMeters: number): string => {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  if (sqMeters >= 10000) {
    return `${(sqMeters / 10000).toFixed(2)} ha`;
  }
  return `${sqMeters.toFixed(1)} m²`;
};

// Returns bounds [ [south, west], [north, east] ]
export const getBounds = (points: Coordinate[]): [[number, number], [number, number]] | null => {
    if (points.length === 0) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    points.forEach(p => {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
    });
    return [[minLat, minLng], [maxLat, maxLng]];
};
