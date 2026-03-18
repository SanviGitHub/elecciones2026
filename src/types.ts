export interface Candidate {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
  isPaused?: boolean;
}

export interface Vote {
  id: string;
  candidateId: string;
  role?: string;
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
  votingEnded?: boolean;
  totalStudents?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: any; // Firebase Timestamp
  adminId: string;
}
