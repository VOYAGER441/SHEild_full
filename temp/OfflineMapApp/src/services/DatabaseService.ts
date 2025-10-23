import * as SQLite from 'expo-sqlite';
import { OfflineRegion, TileWithPath, RegionStats, SQLResultSet } from '../types';

class DatabaseService {
  private db: SQLite.WebSQLDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = SQLite.openDatabase('OfflineMaps.db');
      await this.createTables();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database init error:', error);
      throw error;
    }
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        // Create regions table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS regions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            bounds TEXT NOT NULL,
            min_zoom INTEGER,
            max_zoom INTEGER,
            tile_count INTEGER,
            download_date TEXT,
            size_bytes INTEGER
          )`,
          [],
          () => {},
          (_, error) => {
            console.error('Error creating regions table:', error);
            return false;
          }
        );

        // Create tiles table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS tiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region_id INTEGER,
            x INTEGER,
            y INTEGER,
            z INTEGER,
            file_path TEXT,
            size_bytes INTEGER,
            FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
            UNIQUE(x, y, z)
          )`,
          [],
          () => {},
          (_, error) => {
            console.error('Error creating tiles table:', error);
            return false;
          }
        );

        // Create index
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_tiles_coords ON tiles(x, y, z)`,
          [],
          () => {
            console.log('Tables created successfully');
          },
          (_, error) => {
            console.error('Error creating index:', error);
            return false;
          }
        );
      }, reject, resolve);
    });
  }

  async saveRegion(region: OfflineRegion): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
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
          ],
          (_, result) => {
            resolve(result.insertId!);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async saveTile(regionId: number, tile: TileWithPath): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO tiles (region_id, x, y, z, file_path, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [regionId, tile.x, tile.y, tile.z, tile.filePath, tile.sizeBytes || 0],
          () => {
            resolve();
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getTileFilePath(x: number, y: number, z: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT file_path FROM tiles WHERE x = ? AND y = ? AND z = ?`,
          [x, y, z],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).file_path);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getAllRegions(): Promise<OfflineRegion[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM regions ORDER BY download_date DESC`,
          [],
          (_, result) => {
            const regions: OfflineRegion[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              regions.push({
                id: row.id,
                name: row.name,
                bounds: JSON.parse(row.bounds),
                minZoom: row.min_zoom,
                maxZoom: row.max_zoom,
                tileCount: row.tile_count,
                downloadDate: row.download_date,
                sizeBytes: row.size_bytes,
              });
            }
            resolve(regions);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async deleteRegion(regionId: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const filePaths: string[] = [];

      this.db.transaction((tx) => {
        // Get all tile file paths first
        tx.executeSql(
          `SELECT file_path FROM tiles WHERE region_id = ?`,
          [regionId],
          (_, result) => {
            for (let i = 0; i < result.rows.length; i++) {
              filePaths.push(result.rows.item(i).file_path);
            }

            // Delete tiles
            tx.executeSql(
              `DELETE FROM tiles WHERE region_id = ?`,
              [regionId],
              () => {
                // Delete region
                tx.executeSql(
                  `DELETE FROM regions WHERE id = ?`,
                  [regionId],
                  () => {},
                  (_, error) => {
                    console.error('Error deleting region:', error);
                    return false;
                  }
                );
              },
              (_, error) => {
                console.error('Error deleting tiles:', error);
                return false;
              }
            );
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }, reject, () => resolve(filePaths));
    });
  }

  async getRegionStats(regionId: number): Promise<RegionStats> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT COUNT(*) as count, SUM(size_bytes) as total_size 
           FROM tiles WHERE region_id = ?`,
          [regionId],
          (_, result) => {
            resolve(result.rows.item(0));
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(
        (tx) => {
          tx.executeSql(`DELETE FROM tiles`);
          tx.executeSql(`DELETE FROM regions`);
        },
        reject,
        resolve
      );
    });
  }
}

export default new DatabaseService();