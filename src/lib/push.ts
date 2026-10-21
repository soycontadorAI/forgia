import { createClient } from '@/lib/supabase/client';

// Recordatorios push en el navegador. En iPhone sólo funcionan con Forgia
// agregada a la pantalla de inicio (iOS 16.4+).

export type PushStatus = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export const DEFAULT_REMINDER_HOUR = 18;
const SW_URL = '/sw.js';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Algunos navegadores sin servicio de push nunca responden a subscribe(). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('push timeout')), ms)),
  ]);
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<{ status: PushStatus; hour: number }> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return { status: isIOS() && !isStandalone() ? 'needs-install' : 'unsupported', hour: DEFAULT_REMINDER_HOUR };
  if (Notification.permission === 'denied') return { status: 'denied', hour: DEFAULT_REMINDER_HOUR };

  const subscription = await currentSubscription();
  if (!subscription) return { status: 'off', hour: DEFAULT_REMINDER_HOUR };

  const { data } = await createClient()
    .from('push_subscriptions')
    .select('reminder_hour')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle();
  // Suscrito en el navegador pero sin fila (p. ej. otra cuenta): se trata como apagado
  if (!data) return { status: 'off', hour: DEFAULT_REMINDER_HOUR };
  return { status: 'on', hour: data.reminder_hour };
}

export async function enablePushReminders(userId: string, hour: number): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const registration = await navigator.serviceWorker.register(SW_URL);
  await withTimeout(navigator.serviceWorker.ready, 15000);
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      }),
      15000
    ));

  const json = subscription.toJSON();
  const supabase = createClient();
  // Si este navegador estaba ligado a otra cuenta, esa fila no es visible (RLS);
  // se borra la propia por endpoint y se inserta de nuevo
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    platform: 'web',
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminder_hour: hour,
  });
  if (error) throw new Error(`Error al guardar el recordatorio: ${error.message}`);
  return 'on';
}

export async function updateReminderHour(hour: number): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  const { error } = await createClient()
    .from('push_subscriptions')
    .update({ reminder_hour: hour, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    .eq('endpoint', subscription.endpoint);
  if (error) throw new Error(`Error al cambiar la hora: ${error.message}`);
}

export async function disablePushReminders(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await createClient().from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}
