import { v4 as uuidv4 } from 'uuid';
import fpPromise from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'school_election_device_id';
const HAS_VOTED_KEY = 'school_election_has_voted';

export async function getDeviceInfo(): Promise<{ deviceId: string; hwid: string | null }> {
  let hwid: string | null = null;
  
  try {
    // Add a timeout to prevent hanging on mobile browsers with strict privacy
    const fpPromiseWithTimeout = Promise.race([
      fpPromise.load().then(fp => fp.get()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Fingerprint timeout')), 3000))
    ]);
    
    const result = await fpPromiseWithTimeout as any;
    hwid = `fp-${result.visitorId}`;
  } catch (e) {
    console.error('Fingerprint failed or timed out', e);
  }

  // Light mode or fallback
  let deviceId = `ls-${uuidv4()}`;
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      deviceId = stored;
    } else {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch (e) {
    console.warn('LocalStorage not available', e);
  }
  
  return { deviceId, hwid };
}

export function hasVoted(): boolean {
  try {
    return localStorage.getItem(HAS_VOTED_KEY) === 'true';
  } catch (e) {
    console.warn('LocalStorage not available', e);
    return false;
  }
}

export function markAsVoted(): void {
  try {
    localStorage.setItem(HAS_VOTED_KEY, 'true');
  } catch (e) {
    console.warn('LocalStorage not available', e);
  }
}

export function clearVotedStatus(): void {
  try {
    localStorage.removeItem(HAS_VOTED_KEY);
  } catch (e) {
    console.warn('LocalStorage not available', e);
  }
}
