import * as SQLite from 'expo-sqlite';
import { OfflineRegion, TileWithPath, RegionStats } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('OfflineMaps.db');
      await this.createTables();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database init error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        bounds TEXT NOT NULL,
        min_zoom INTEGER,
        max_zoom INTEGER,
        tile_count INTEGER,
        download_date TEXT,
        size_bytes INTEGER
      );

      CREATE TABLE IF NOT EXISTS tiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER,
        x INTEGER,
        y INTEGER,
        z INTEGER,
        file_path TEXT,
        size_bytes INTEGER,
        FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
        UNIQUE(x, y, z)
      );

      CREATE INDEX IF NOT EXISTS idx_tiles_coords ON tiles(x, y, z);
    `);
  }

  async saveRegion(region: OfflineRegion): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO regions (name, bounds, min_zoom, max_zoom, tile_count, download_date, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        region.name,
        JSON.stringify(region.bounds),
        region.minZoom,
        region.maxZoom,
        region.tileCount,
        new Date().toISOString(),
        region.sizeBytes || 0,
      ]
    );

    return result.lastInsertRowId;
  }

  async saveTile(regionId: number, tile: TileWithPath): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO tiles (region_id, x, y, z, file_path, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [regionId, tile.x, tile.y, tile.z, tile.filePath, tile.sizeBytes || 0]
    );
  }

  async getTileFilePath(x: number, y: number, z: number): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ file_path: string }>(
      `SELECT file_path FROM tiles WHERE x = ? AND y = ? AND z = ?`,
      [x, y, z]
    );

    return result?.file_path || null;
  }

  async getAllRegions(): Promise<OfflineRegion[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM regions ORDER BY download_date DESC`
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      bounds: JSON.parse(row.bounds),
      minZoom: row.min_zoom,
      maxZoom: row.max_zoom,
      tileCount: row.tile_count,
      downloadDate: row.download_date,
      sizeBytes: row.size_bytes,
    }));
  }

  async deleteRegion(regionId: number): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tiles = await this.db.getAllAsync<{ file_path: string }>(
      `SELECT file_path FROM tiles WHERE region_id = ?`,
      [regionId]
    );

    const filePaths = tiles.map(t => t.file_path);

    await this.db.runAsync(`DELETE FROM tiles WHERE region_id = ?`, [regionId]);
    await this.db.runAsync(`DELETE FROM regions WHERE id = ?`, [regionId]);

    return filePaths;
  }

  async getRegionStats(regionId: number): Promise<RegionStats> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<RegionStats>(
      `SELECT COUNT(*) as count, SUM(size_bytes) as total_size 
       FROM tiles WHERE region_id = ?`,
      [regionId]
    );

    return result || { count: 0, total_size: 0 };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM tiles;
      DELETE FROM regions;
    `);
  }
}

export default new DatabaseService();