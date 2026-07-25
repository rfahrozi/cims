import fs from 'node:fs';
import { loadConfig } from '../config.mjs';

const config = loadConfig();
if (fs.existsSync(config.dbPath)) fs.rmSync(config.dbPath, {force: true});
for (const suffix of ['-shm', '-wal']) if (fs.existsSync(config.dbPath + suffix)) fs.rmSync(config.dbPath + suffix, {force: true});
console.log(`Removed development database: ${config.dbPath}`);
