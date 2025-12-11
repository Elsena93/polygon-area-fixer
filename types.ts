export interface Coordinate {
  lat: number;
  lng: number;
}

export interface PolygonData {
  id: string;
  points: Coordinate[];
  areaSqMeters: number;
}

export interface ExportOptions {
  filename: string;
  format: 'shp' | 'geojson' | 'kml';
}

export type DrawMode = 'drawing' | 'editing' | 'idle';
