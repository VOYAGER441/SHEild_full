import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import MapView, { Polygon, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import {
    getTilesForBounds,
    estimateDownloadSize,
    calculateArea,
} from '../utils/tileCalculations';
import { Bounds, DownloadProgress } from '../types';
import TileDownloader from '../services/TileDownloader';
import DatabaseService from '../services/DatabaseService';
import { DOWNLOAD_CONFIG } from '../config/mapConfig';

const DownloadScreen: React.FC = () => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);
    const [regionName, setRegionName] = useState('');
    const [minZoom, setMinZoom] = useState(DOWNLOAD_CONFIG.defaultMinZoom);
    const [maxZoom, setMaxZoom] = useState(DOWNLOAD_CONFIG.defaultMaxZoom);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState<DownloadProgress | null>(null);
    const [firstPoint, setFirstPoint] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    const mapRef = useRef<MapView | null>(null);

    const initialRegion: Region = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const startAreaSelection = () => {
        setIsSelecting(true);
        setSelectedBounds(null);
        setFirstPoint(null);
        Alert.alert(
            'Select Area',
            'Tap two points on the map to define the download area.',
            [{ text: 'OK' }]
        );
    };

    const handleMapPress = (event: any) => {
        if (!isSelecting) return;

        const { latitude, longitude } = event.nativeEvent.coordinate;

        if (!firstPoint) {
            // First point selected
            setFirstPoint({ latitude, longitude });
        } else {
            // Second point selected - complete selection
            const bounds: Bounds = {
                north: Math.max(firstPoint.latitude, latitude),
                south: Math.min(firstPoint.latitude, latitude),
                east: Math.max(firstPoint.longitude, longitude),
                west: Math.min(firstPoint.longitude, longitude),
            };

            setSelectedBounds(bounds);
            setIsSelecting(false);

            const tiles = getTilesForBounds(bounds, minZoom, maxZoom);
            const area = calculateArea(bounds);

            Alert.alert(
                'Area Selected',
                `Area: ${area.toFixed(2)} km²\nTiles: ${tiles.length
                }\nEstimated size: ${estimateDownloadSize(tiles.length)}`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                            setSelectedBounds(null);
                            setFirstPoint(null);
                        },
                    },
                    { text: 'Continue' },
                ]
            );
        }
    };

    const downloadSelectedArea = async () => {
        if (!selectedBounds || !regionName.trim()) {
            Alert.alert('Error', 'Please select an area and enter a name');
            return;
        }

        const tiles = getTilesForBounds(selectedBounds, minZoom, maxZoom);

        Alert.alert(
            'Confirm Download',
            `Region: ${regionName}\nTiles: ${tiles.length}\nSize: ~${estimateDownloadSize(
                tiles.length
            )}\n\nThis may take several minutes.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Download',
                    onPress: async () => {
                        setDownloading(true);
                        setProgress({
                            completed: 0,
                            total: tiles.length,
                            percentage: 0,
                            failed: 0,
                            totalBytes: 0,
                        });

                        try {
                            // Download tiles
                            const result = await TileDownloader.downloadTiles(
                                tiles,
                                (prog) => {
                                    setProgress(prog);
                                }
                            );

                            // Save to database
                            const regionId = await DatabaseService.saveRegion({
                                name: regionName,
                                bounds: selectedBounds,
                                minZoom,
                                maxZoom,
                                tileCount: tiles.length,
                                sizeBytes: result.totalBytes,
                            });

                            // Save tile references
                            for (const tile of result.results) {
                                await DatabaseService.saveTile(regionId, tile);
                            }

                            Alert.alert(
                                'Success!',
                                `Downloaded ${result.completed} tiles (${(
                                    result.totalBytes /
                                    1024 /
                                    1024
                                ).toFixed(2)} MB)\nFailed: ${result.failed}`
                            );

                            // Reset
                            setRegionName('');
                            setSelectedBounds(null);
                            setFirstPoint(null);
                            setDownloading(false);
                            setProgress(null);
                        } catch (error) {
                            Alert.alert(
                                'Error',
                                `Download failed: ${error instanceof Error ? error.message : 'Unknown error'
                                }`
                            );
                            setDownloading(false);
                            setProgress(null);
                        }
                    },
                },
            ]
        );
    };

    const cancelDownload = () => {
        TileDownloader.cancelDownload();
        setDownloading(false);
        setProgress(null);
    };

    const getPolygonCoordinates = () => {
        if (!selectedBounds && !firstPoint) return [];

        if (firstPoint && !selectedBounds) {
            // Show first point marker
            return [
                {
                    latitude: firstPoint.latitude - 0.001,
                    longitude: firstPoint.longitude - 0.001,
                },
                {
                    latitude: firstPoint.latitude - 0.001,
                    longitude: firstPoint.longitude + 0.001,
                },
                {
                    latitude: firstPoint.latitude + 0.001,
                    longitude: firstPoint.longitude + 0.001,
                },
                {
                    latitude: firstPoint.latitude + 0.001,
                    longitude: firstPoint.longitude - 0.001,
                },
            ];
        }

        if (selectedBounds) {
            return [
                {
                    latitude: selectedBounds.north,
                    longitude: selectedBounds.west,
                },
                {
                    latitude: selectedBounds.north,
                    longitude: selectedBounds.east,
                },
                {
                    latitude: selectedBounds.south,
                    longitude: selectedBounds.east,
                },
                {
                    latitude: selectedBounds.south,
                    longitude: selectedBounds.west,
                },
            ];
        }

        return [];
    };

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={initialRegion}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton>
                {/* Draw selected bounds or first point */}
                {(selectedBounds || firstPoint) && (
                    <Polygon
                        coordinates={getPolygonCoordinates()}
                        fillColor="rgba(74, 144, 226, 0.3)"
                        strokeColor="#4A90E2"
                        strokeWidth={3}
                    />
                )}
            </MapView>

            {/* Status indicator */}
            {isSelecting && (
                <View style={styles.selectionIndicator}>
                    <Text style={styles.indicatorText}>
                        {firstPoint ? '📍 Tap second point' : '📍 Tap first point'}
                    </Text>
                </View>
            )}

            {/* Controls */}
            <View style={styles.controls}>
                {downloading && progress ? (
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressTitle}>Downloading...</Text>
                        <Text style={styles.progressText}>
                            {progress.completed} / {progress.total} tiles ({progress.percentage}
                            %)
                        </Text>
                        <ActivityIndicator
                            size="large"
                            color="#4A90E2"
                            style={{ marginVertical: 10 }}
                        />
                        <Text style={styles.progressSize}>
                            {(progress.totalBytes / 1024 / 1024).toFixed(2)} MB
                        </Text>
                        {progress.failed > 0 && (
                            <Text style={styles.failedText}>Failed: {progress.failed}</Text>
                        )}
                        <TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.controlsScroll}
                        showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Download Offline Map</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Region name (e.g., San Francisco)"
                            value={regionName}
                            onChangeText={setRegionName}
                            placeholderTextColor="#999"
                        />

                        <View style={styles.zoomContainer}>
                            <View style={styles.zoomInput}>
                                <Text style={styles.label}>Min Zoom:</Text>
                                <TextInput
                                    style={styles.zoomTextInput}
                                    value={String(minZoom)}
                                    onChangeText={(val) => setMinZoom(10)}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.zoomInput}>
                                <Text style={styles.label}>Max Zoom:</Text>
                                <TextInput
                                    style={styles.zoomTextInput}
                                    value={String(maxZoom)}
                                    onChangeText={(val) => setMaxZoom(14)}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isSelecting && styles.buttonActive]}
                            onPress={startAreaSelection}
                            disabled={downloading}>
                            <Text style={styles.buttonText}>
                                {isSelecting ? '📍 Selecting Area...' : '🎯 Select Area'}
                            </Text>
                        </TouchableOpacity>

                        {selectedBounds && (
                            <TouchableOpacity
                                style={[styles.button, styles.downloadButton]}
                                onPress={downloadSelectedArea}
                                disabled={downloading}>
                                <Text style={styles.buttonText}>⬇️ Download Region</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Tips:</Text>
                            <Text style={styles.infoText}>
                                • Tap two points to define area{'\n'}• Lower zoom = less detail,
                                smaller size{'\n'}• Recommended: zoom 10-14{'\n'}• Use WiFi for
                                large downloads
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    selectionIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    indicatorText: {
        backgroundColor: '#FFA726',
        color: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        fontSize: 16,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    controlsScroll: {
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
        color: '#333',
    },
    zoomContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    zoomInput: {
        flex: 1,
        marginHorizontal: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        color: '#333',
    },
    zoomTextInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#4A90E2',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonActive: {
        backgroundColor: '#FFA726',
    },
    downloadButton: {
        backgroundColor: '#66BB6A',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoBox: {
        backgroundColor: '#FFF9E6',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    progressContainer: {
        padding: 20,
        alignItems: 'center',
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    progressText: {
        fontSize: 16,
        color: '#666',
    },
    progressSize: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
    },
    failedText: {
        fontSize: 14,
        color: '#FF5252',
        marginTop: 4,
    },
    cancelButton: {
        marginTop: 16,
        backgroundColor: '#FF5252',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default DownloadScreen;