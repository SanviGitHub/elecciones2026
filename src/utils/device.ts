import { v4 as uuidv4 } from 'uuid';
import fpPromise from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'school_election_device_id';
const HAS_VOTED_KEY = 'school_election_has_voted';

export async function getDeviceInfo(): Promise<{ deviceId: string; hwid: string | null }> {
  let hwid: string | null = null;
  
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    hwid = `fp-${result.visitorId}`;
  } catch (e) {
    console.error('Fingerprint failed', e);
  }

  // Light mode or fallback
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `ls-${uuidv4()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return { deviceId, hwid };
}

export function hasVoted(): boolean {
  return localStorage.getItem(HAS_VOTED_KEY) === 'true';
}

export function markAsVoted(): void {
  localStorage.setItem(HAS_VOTED_KEY, 'true');
}

export function clearVotedStatus(): void {
  localStorage.removeItem(HAS_VOTED_KEY);
}
