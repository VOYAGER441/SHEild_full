import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import DatabaseService from '../services/DatabaseService';
import { OfflineRegion } from '../types';
import { formatBytes, formatDate } from '../utils/tileCalculations';

const ManageRegionsScreen: React.FC = () => {
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getAllRegions();
      setRegions(data);

      // Calculate total size
      let size = 0;
      for (const region of data) {
        size += region.sizeBytes || 0;
      }
      setTotalSize(size);

      setLoading(false);
    } catch (error) {
      console.error('Error loading regions:', error);
      setLoading(false);
    }
  };

  const deleteRegion = async (region: OfflineRegion) => {
    if (!region.id) return;

    Alert.alert(
      'Delete Region',
      `Delete "${region.name}"? This will remove all downloaded tiles.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const filePaths = await DatabaseService.deleteRegion(region.id!);

              // Delete actual files
              for (const path of filePaths) {
                try {
                  const fileInfo = await FileSystem.getInfoAsync(path);
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(path);
                  }
                } catch (e) {
                  console.log('Could not delete file:', path);
                }
              }

              Alert.alert('Success', 'Region deleted');
              loadRegions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete region');
            }
          },
        },
      ]
    );
  };

  const renderRegion = ({ item }: { item: OfflineRegion }) => (
    <View style={styles.regionCard}>
      <View style={styles.regionHeader}>
        <Text style={styles.regionName}>📍 {item.name}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteRegion(item)}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.regionDetails}>
        <Text style={styles.detailText}>
          📊 {item.tileCount} tiles • {formatBytes(item.sizeBytes || 0)}
        </Text>
        <Text style={styles.detailText}>
          🔍 Zoom: {item.minZoom} - {item.maxZoom}
        </Text>
        {item.downloadDate && (
          <Text style={styles.detailText}>
            📅 {formatDate(item.downloadDate)}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading regions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloaded Regions</Text>
        <Text style={styles.headerSubtitle}>
          {regions.length} regions • {formatBytes(totalSize)} total
        </Text>
      </View>

      {regions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Downloaded Regions</Text>
          <Text style={styles.emptyText}>
            Go to Download tab to save maps for offline use
          </Text>
        </View>
      ) : (
        <FlatList
          data={regions}
          renderItem={renderRegion}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  regionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 20,
  },
  regionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ManageRegionsScreen;