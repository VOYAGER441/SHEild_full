import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Switch, Platform, Alert } from 'react-native';
import { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import OfflineMapView from '../components/OfflineMapView';
import { MAP_CONFIG } from '../config/mapConfig';

const MapScreen: React.FC = () => {
  const [offlineMode, setOfflineMode] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your position on the map');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const initialRegion: Region = {
    latitude: location?.coords.latitude || MAP_CONFIG.defaultCenter.latitude,
    longitude: location?.coords.longitude || MAP_CONFIG.defaultCenter.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleRegionChange = (region: Region) => {
    setCurrentRegion(region);
  };

  return (
    <View style={styles.container}>
      <OfflineMapView
        initialRegion={initialRegion}
        offlineMode={offlineMode}
        onRegionChange={handleRegionChange}
      />

      {/* Offline Mode Toggle */}
      <View style={styles.offlineToggle}>
        <Text style={styles.toggleLabel}>
          {offlineMode ? '📡 Offline' : '🌐 Online'}
        </Text>
        <Switch
          value={offlineMode}
          onValueChange={setOfflineMode}
          trackColor={{ false: '#ccc', true: '#4A90E2' }}
          thumbColor={offlineMode ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Current Location Info */}
      {currentRegion && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 {currentRegion.latitude.toFixed(5)}
          </Text>
          <Text style={styles.locationText}>
            {currentRegion.longitude.toFixed(5)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapScreen;