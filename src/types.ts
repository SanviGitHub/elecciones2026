export type Role = 'DELEGADO' | 'SUBDELEGADO' | 'TERCER_DELEGADO';

export interface Candidate {
  id: string;
  name: string;
  role: Role;
  photoUrl?: string;
  isPaused?: boolean;
}

export interface Vote {
  id: string;
  candidateId: string;
  role: Role;
  deviceId: string;
  timestamp: any; // Firebase Timestamp
  ip?: string;
  hwid?: string;
}

export interface Settings {
  maintenanceMode: boolean;
  restrictionMode: 'strict' | 'light';
  votingOpenTime: any | null; // Firebase Timestamp
  votingCloseTime: any | null; // Firebase Timestamp
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: any; // Firebase Timestamp
  adminId: string;
}
