export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Tile {
  x: number;
  y: number;
  z: number;
}

export interface TileWithPath extends Tile {
  filePath: string;
  sizeBytes: number;
}

export interface DownloadProgress {
  completed: number;
  total: number;
  failed: number;
  percentage: number;
  totalBytes: number;
  currentTile?: Tile;
}

export interface OfflineRegion {
  id?: number;
  name: string;
  bounds: Bounds;
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  downloadDate?: string;
  sizeBytes?: number;
}

export interface RegionStats {
  count: number;
  total_size: number;
}

export interface DownloadResult {
  results: TileWithPath[];
  completed: number;
  failed: number;
  totalBytes: number;
}

export type TabType = 'map' | 'download' | 'manage';

export interface SQLResultSet {
  insertId?: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
}