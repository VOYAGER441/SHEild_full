import { Bounds, Tile } from '../types';

/**
 * Convert latitude to tile Y coordinate
 */
export const lat2tile = (lat: number, zoom: number): number => {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
};

/**
 * Convert longitude to tile X coordinate
 */
export const lon2tile = (lon: number, zoom: number): number => {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
};

/**
 * Convert tile X coordinate to longitude
 */
export const tile2lon = (x: number, zoom: number): number => {
  return (x / Math.pow(2, zoom)) * 360 - 180;
};

/**
 * Convert tile Y coordinate to latitude
 */
export const tile2lat = (y: number, zoom: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/**
 * Get all tiles for a bounding box across zoom levels
 */
export const getTilesForBounds = (
  bounds: Bounds,
  minZoom: number,
  maxZoom: number
): Tile[] => {
  const tiles: Tile[] = [];
  const { north, south, east, west } = bounds;

  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const minX = lon2tile(west, zoom);
    const maxX = lon2tile(east, zoom);
    const minY = lat2tile(north, zoom);
    const maxY = lat2tile(south, zoom);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles;
};

/**
 * Estimate download size based on tile count
 */
export const estimateDownloadSize = (tileCount: number): string => {
  const avgTileSize = 20; // Average PNG tile size in KB
  const totalKB = tileCount * avgTileSize;

  if (totalKB < 1024) {
    return `${Math.round(totalKB)} KB`;
  } else if (totalKB < 1024 * 1024) {
    return `${(totalKB / 1024).toFixed(2)} MB`;
  } else {
    return `${(totalKB / 1024 / 1024).toFixed(2)} GB`;
  }
};

/**
 * Calculate area in square kilometers
 */
export const calculateArea = (bounds: Bounds): number => {
  const { north, south, east, west } = bounds;

  const R = 6371; // Earth's radius in km
  const dLat = ((north - south) * Math.PI) / 180;
  const dLon = ((east - west) * Math.PI) / 180;

  const avgLat = (((north + south) / 2) * Math.PI) / 180;

  const width = R * dLon * Math.cos(avgLat);
  const height = R * dLat;

  return Math.abs(width * height);
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};