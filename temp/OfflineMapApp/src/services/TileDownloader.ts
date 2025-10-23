import * as FileSystem from 'expo-file-system';
import { Tile, TileWithPath, DownloadProgress, DownloadResult } from '../types';
import { getPngTileUrl } from '../config/mapConfig';
import { DOWNLOAD_CONFIG } from '../config/mapConfig';

class TileDownloader {
  private aborted: boolean = false;

  async downloadTile(
    x: number,
    y: number,
    z: number,
    destinationPath: string
  ): Promise<{ success: boolean; sizeBytes?: number; error?: string }> {
    const url = getPngTileUrl(x, y, z);

    try {
      const result = await FileSystem.downloadAsync(url, destinationPath);

      if (result.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(destinationPath);
        return {
          success: true,
          sizeBytes: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        };
      } else {
        throw new Error(`HTTP ${result.status}`);
      }
    } catch (error) {
      console.error(`Failed to download tile ${z}/${x}/${y}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async downloadTiles(
    tiles: Tile[],
    progressCallback?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    const total = tiles.length;
    let completed = 0;
    let failed = 0;
    let totalBytes = 0;

    // Create base directory
    const baseDir = this.getCacheDirectory();
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });

    const results: TileWithPath[] = [];
    this.aborted = false;

    for (const tile of tiles) {
      if (this.aborted) {
        break;
      }

      const { x, y, z } = tile;

      // Create directory structure: z/x/y.png
      const tileDir = `${baseDir}/${z}/${x}`;
      await FileSystem.makeDirectoryAsync(tileDir, { intermediates: true });

      const filePath = `${tileDir}/${y}.png`;

      // Check if tile already exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        completed++;
        const size = 'size' in fileInfo ? fileInfo.size : 0;
        totalBytes += size;

        results.push({
          ...tile,
          filePath,
          sizeBytes: size,
        });

        progressCallback?.({
          completed,
          total,
          failed,
          percentage: Math.round((completed / total) * 100),
          totalBytes,
        });
        continue;
      }

      // Download tile
      const result = await this.downloadTile(x, y, z, filePath);

      if (result.success && result.sizeBytes) {
        completed++;
        totalBytes += result.sizeBytes;
        results.push({
          ...tile,
          filePath,
          sizeBytes: result.sizeBytes,
        });
      } else {
        failed++;
      }

      // Call progress callback
      progressCallback?.({
        completed,
        total,
        failed,
        percentage: Math.round((completed / total) * 100),
        totalBytes,
        currentTile: tile,
      });

      // Small delay to prevent overwhelming the server
      await new Promise((resolve) =>
        setTimeout(resolve, DOWNLOAD_CONFIG.requestDelay)
      );
    }

    return {
      results,
      completed,
      failed,
      totalBytes,
    };
  }

  cancelDownload(): void {
    this.aborted = true;
  }

  getCacheDirectory(): string {
    return `${FileSystem.documentDirectory}offline_tiles`;
  }

  getTileFilePath(x: number, y: number, z: number): string {
    return `${this.getCacheDirectory()}/${z}/${x}/${y}.png`;
  }

  async tileExists(x: number, y: number, z: number): Promise<boolean> {
    const filePath = this.getTileFilePath(x, y, z);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  }

  getLocalTileUri(x: number, y: number, z: number): string {
    return `file://${this.getTileFilePath(x, y, z)}`;
  }

  async clearCache(): Promise<void> {
    const cacheDir = this.getCacheDirectory();
    const fileInfo = await FileSystem.getInfoAsync(cacheDir);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(cacheDir);
    }
  }

  async getCacheSize(): Promise<number> {
    const cacheDir = this.getCacheDirectory();
    const fileInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!fileInfo.exists) return 0;

    const getAllFiles = async (dir: string): Promise<number> => {
      const items = await FileSystem.readDirectoryAsync(dir);
      let size = 0;

      for (const item of items) {
        const itemPath = `${dir}/${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);

        if (itemInfo.exists) {
          if (itemInfo.isDirectory) {
            size += await getAllFiles(itemPath);
          } else if ('size' in itemInfo) {
            size += itemInfo.size;
          }
        }
      }
      return size;
    };

    return await getAllFiles(cacheDir);
  }
}

export default new TileDownloader();