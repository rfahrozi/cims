export interface CreateSessionInput {
  hearing_reference: string;
  start_at: string;
  end_at: string;
  recording_policy?: 'DISABLED' | 'COURT_CONTROLLED';
}

export interface CreateRoomInput {
  room_code: string;
  room_type: 'MAIN' | 'WAITING' | 'DEFENDANT' | 'WITNESS' | 'CONSULTATION';
  recording_allowed: boolean;
}

export interface SessionResponse {
  provider_session_reference: string;
  state: 'READY';
}
