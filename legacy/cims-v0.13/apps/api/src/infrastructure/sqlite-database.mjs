import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class SqliteDatabase {
  constructor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.filePath = filePath;
    this.raw = new DatabaseSync(filePath);
    this.raw.exec(
      'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;'
    );
  }

  exec(sql) {
    return this.raw.exec(sql);
  }
  run(sql, ...params) {
    return this.raw.prepare(sql).run(...params);
  }
  get(sql, ...params) {
    return this.raw.prepare(sql).get(...params);
  }
  all(sql, ...params) {
    return this.raw.prepare(sql).all(...params);
  }

  transaction(callback) {
    this.raw.exec('BEGIN IMMEDIATE');
    try {
      const result = callback();
      this.raw.exec('COMMIT');
      return result;
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.raw.close();
  }
}
