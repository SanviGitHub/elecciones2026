import fpPromise from '@fingerprintjs/fingerprintjs';

export const getDeviceId = async (): Promise<string> => {
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error getting fingerprint:', error);
    // Fallback to localStorage
    let deviceId = localStorage.getItem('fallback_device_id');
    if (!deviceId) {
      deviceId = 'fallback-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('fallback_device_id', deviceId);
    }
    return deviceId;
  }
};
