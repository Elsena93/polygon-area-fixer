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

// Calculate planar area using Shoelace formula
const calculatePlanarArea = (ring: number[][]): number => {
  let area = 0;
  if (ring.length < 3) return 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  
  return Math.abs(area) / 2.0;
};

export const calculateArea = (points: Coordinate[]): number => {
  const polygon = toTurfPolygon(points);
  if (!polygon) return 0;

  // Project WGS84 (Lat/Lng) to Web Mercator (EPSG:3857) in Meters
  // This satisfies the requirement for area to be measured on auxiliary Mercator (3857)
  const projected = turf.toMercator(polygon);

  // Calculate planar area on the projected coordinates
  // turf.area() is for geodesic (WGS84), so we use a custom planar function
  return calculatePlanarArea(projected.geometry.coordinates[0]);
};

export const scalePolygonToArea = (points: Coordinate[], targetAreaSqM: number): Coordinate[] => {
  // calculateArea now returns the EPSG:3857 area
  const currentArea = calculateArea(points);
  if (currentArea === 0 || targetAreaSqM <= 0) return points;

  const polygon = toTurfPolygon(points);
  if (!polygon) return points;

  // Calculate scale factor: Area scales with square of linear dimension
  // target = current * factor^2  =>  factor = sqrt(target / current)
  const factor = Math.sqrt(targetAreaSqM / currentArea);
  
  const centroid = turf.centroid(polygon);
  
  // We apply the scaling to the WGS84 polygon using the factor derived from 3857 area ratio.
  // This preserves the WGS84 shape characteristics while adjusting the size.
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