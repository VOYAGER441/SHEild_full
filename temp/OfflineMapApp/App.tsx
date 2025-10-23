import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import DatabaseService from './src/services/DatabaseService';
import MapScreen from './src/screens/MapScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import ManageRegionsScreen from './src/screens/ManageRegionsScreen';
import { TabType } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await DatabaseService.init();
      setInitialized(true);
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization error:', error);
    }
  };

  const renderScreen = () => {
    if (!initialized) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'map':
        return <MapScreen />;
      case 'download':
        return <DownloadScreen />;
      case 'manage':
        return <ManageRegionsScreen />;
      default:
        return <MapScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#4A90E2" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Offline Maps</Text>
        <Text style={styles.headerSubtitle}>MapTiler Powered</Text>
      </View>

      <View style={styles.content}>{renderScreen()}</View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}>
          <Text style={styles.tabIcon}>🗺️</Text>
          <Text
            style={[
              styles.tabText,
              activeTab === 'map' && styles.activeTabText,
            ]}>
            Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'download' && styles.activeTab]}
          onPress={() => setActiveTab('download')}>
          <Text style={styles.tabIcon}>⬇️</Text>
          <Text
            style={[
              styles.tabText,
              activeTab === 'download' && styles.activeTabText,
            ]}>
            Download
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}>
          <Text style={styles.tabIcon}>📁</Text>
          <Text
            style={[
              styles.tabText,
              activeTab === 'manage' && styles.activeTabText,
            ]}>
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f8f8f8',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
    borderTopWidth: 3,
    borderTopColor: '#4A90E2',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
  },
});