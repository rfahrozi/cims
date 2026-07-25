import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqliteDatabase } from './sqlite-database.mjs';
import { seedDevelopmentData } from './seed.mjs';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, '../../../..');
export function createDatabase(config) {
  const database = new SqliteDatabase(config.dbPath);
  const schema = fs.readFileSync(path.join(root, 'database/sqlite/0001_sprint_0_12.sql'), 'utf8');
  database.exec(schema);
  seedDevelopmentData(database, config);
  return database;
}
