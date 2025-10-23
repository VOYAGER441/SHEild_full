// MapTiler API Configuration
export const MAPTILER_CONFIG = {
  apiKey: 'jDgfJYvIrKEVpUffNXOZ',
  baseUrl: 'https://api.maptiler.com',
  tileFormat: 'png',
  version: 'v2',
} as const;

// PNG tiles for display (react-native-maps uses raster tiles)
export const getPngTileUrl = (x: number, y: number, z: number): string => {
  return `https://api.maptiler.com/maps/streets-v2/256/${z}/${x}/${y}.png?key=${MAPTILER_CONFIG.apiKey}`;
};

// Map configuration
export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 37.78825,
    longitude: -122.4324,
  },
  defaultZoom: 12,
  minZoom: 1,
  maxZoom: 18,
  tileSize: 256,
} as const;

// Download configuration
export const DOWNLOAD_CONFIG = {
  defaultMinZoom: 10,
  defaultMaxZoom: 14,
  maxConcurrentDownloads: 5,
  retryAttempts: 3,
  retryDelay: 1000,
  requestDelay: 50, // ms between requests
} as const;