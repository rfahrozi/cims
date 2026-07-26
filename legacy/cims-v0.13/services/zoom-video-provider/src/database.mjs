import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
pragma foreign_keys=on;
pragma journal_mode=WAL;
pragma busy_timeout=5000;
create table if not exists zoom_sessions(
  id text primary key,
  hearing_reference text not null,
  idempotency_key text unique,
  zoom_meeting_id text not null unique,
  zoom_uuid text,
  state text not null,
  start_at text not null,
  end_at text not null,
  recording_policy text not null,
  join_url_cipher text,
  start_url_cipher text,
  passcode_cipher text,
  created_at text not null,
  updated_at text not null
);
create table if not exists zoom_rooms(
  id text primary key,
  session_id text not null references zoom_sessions(id) on delete cascade,
  room_code text not null,
  room_type text not null,
  provider_room_reference text not null unique,
  recording_allowed integer not null default 0,
  unique(session_id,room_code)
);
create table if not exists zoom_access(
  id text primary key,
  session_id text not null references zoom_sessions(id) on delete cascade,
  room_id text not null references zoom_rooms(id),
  participant_reference text not null,
  participant_email text not null,
  participant_name text not null,
  participant_role text not null,
  zoom_registrant_id text not null,
  join_url_cipher text not null,
  expires_at text not null,
  state text not null,
  current_room_id text not null references zoom_rooms(id),
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_zoom_access_session on zoom_access(session_id,state);
create table if not exists zoom_webhook_events(
  event_id text primary key,
  event_type text not null,
  zoom_meeting_id text,
  payload_json text not null,
  occurred_at text,
  received_at text not null
);
`;

export class AdapterDatabase {
  constructor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.raw = new DatabaseSync(filePath);
    this.raw.exec(SCHEMA);
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
  transaction(fn) {
    this.raw.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      this.raw.exec('COMMIT');
      return r;
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }
  close() {
    this.raw.close();
  }
}
