export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface CheckoutReminderPayload {
  title: string;
  message: string;
  itemsCount: number;
  totalAmountFormatted: string;
  iconUrl?: string;
}

export function getPushPermissionStatus(): PushPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestPushPermissionSafely(): Promise<PushPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission || 'unsupported';
  }
}

export async function sendCheckoutReminderPushNotification(
  payload: CheckoutReminderPayload,
  onFallbackClick?: () => void
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const icon = payload.iconUrl || '/pwa-192x192.png';
  const badge = '/pwa-192x192.png';
  const tag = 'rawaj-checkout-reminder';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        const options: NotificationOptions & {
          actions?: { action: string; title: string }[];
          vibrate?: number[];
          renotify?: boolean;
        } = {
          body: payload.message,
          icon,
          badge,
          tag,
          renotify: true,
          dir: 'rtl',
          lang: 'ar',
          vibrate: [180, 80, 180],
          data: { url: '/?openCart=1', action: 'open_cart' },
          actions: [
            {
              action: 'complete-order',
              title: 'إكمال الطلب',
            },
          ],
        };
        await registration.showNotification(payload.title, options);
        return true;
      }
    }
  } catch {
    // Fall back to standard Web Notification API below
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.message,
      icon,
      badge,
      tag,
      dir: 'rtl',
      lang: 'ar',
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore focus errors in restricted contexts
      }
      notification.close();
      if (onFallbackClick) {
        onFallbackClick();
      }
    };
    return true;
  } catch {
    return false;
  }
}
