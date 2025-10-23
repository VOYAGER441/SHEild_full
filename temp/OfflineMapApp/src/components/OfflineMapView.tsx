import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { UrlTile, Region, PROVIDER_GOOGLE ,PROVIDER_DEFAULT} from 'react-native-maps';
import TileDownloader from '../services/TileDownloader';

interface OfflineMapViewProps {
  children?: React.ReactNode;
  onRegionChange?: (region: Region) => void;
  initialRegion?: Region;
  offlineMode?: boolean;
}

const OfflineMapView: React.FC<OfflineMapViewProps> = ({
  children,
  onRegionChange,
  initialRegion,
  offlineMode = false,
}) => {
  const [tileUrlTemplate, setTileUrlTemplate] = useState<string>('');

  useEffect(() => {
    updateTileUrl();
  }, [offlineMode]);

  const updateTileUrl = () => {
    if (offlineMode) {
      const cacheDir = TileDownloader.getCacheDirectory();
      setTileUrlTemplate(`${cacheDir}/{z}/{x}/{y}.png`);
    } else {
      setTileUrlTemplate(
        'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=jDgfJYvIrKEVpUffNXOZ'
      );
    }
  };

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation
      showsMyLocationButton
      mapType="none">
      {tileUrlTemplate && (
        <UrlTile
          urlTemplate={tileUrlTemplate}
          maximumZ={18}
          minimumZ={1}
          flipY={false}
          zIndex={-1}
        />
      )}

      {children}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default OfflineMapView;