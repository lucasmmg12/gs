/**
 * Screen Wake Lock Manager
 * Prevents mobile devices and laptops from sleeping, dimming, or suspending during long recordings (>1h).
 */

let wakeLockSentinel: any = null;
let isRequested = false;
const listeners: Set<(active: boolean) => void> = new Set();

function notifyListeners(active: boolean) {
  listeners.forEach(cb => cb(active));
}

export async function requestScreenWakeLock(): Promise<boolean> {
  isRequested = true;
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    console.warn('Screen Wake Lock API not supported on this browser.');
    notifyListeners(false);
    return false;
  }

  try {
    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    notifyListeners(true);

    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      notifyListeners(false);
    });

    return true;
  } catch (err) {
    console.warn('Screen Wake Lock request failed:', err);
    notifyListeners(false);
    return false;
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  isRequested = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (e) {
      console.warn('Error releasing wake lock:', e);
    }
    wakeLockSentinel = null;
  }
  notifyListeners(false);
}

// Automatically re-acquire when user switches back to this tab if recording is still active
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (isRequested && document.visibilityState === 'visible' && !wakeLockSentinel) {
      await requestScreenWakeLock();
    }
  });
}

export function subscribeWakeLock(callback: (active: boolean) => void): () => void {
  listeners.add(callback);
  callback(Boolean(wakeLockSentinel));
  return () => {
    listeners.delete(callback);
  };
}
