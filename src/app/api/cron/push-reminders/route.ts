import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// Lo llama pg_cron cada hora (ver la migración push_reminders) con
// `Authorization: Bearer <CRON_SECRET>`. Avisa a quien hoy no ha registrado
// un resultado y todavía no cumple su meta semanal.

interface DueReminder {
  id: string;
  platform: 'web' | 'apns';
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  local_date: string;
  days_this_week: number;
  goal: number;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function reminderMessage(r: DueReminder) {
  const missing = Math.max(1, r.goal - r.days_this_week);
  return {
    title: 'Hoy no has entrenado',
    body:
      r.days_this_week === 0
        ? `Tu meta es de ${r.goal} días esta semana. Hoy es buen día para empezar.`
        : `Llevas ${r.days_this_week} de ${r.goal} días esta semana. Te ${missing === 1 ? 'falta 1' : `faltan ${missing}`}.`,
    url: '/app',
    tag: `reminder-${r.local_date}`,
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error('push-reminders: faltan las llaves VAPID');
    return NextResponse.json({ error: 'Configuración incompleta.' }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:privacidad@forgia.fit', publicKey, privateKey);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('due_push_reminders');
  if (error) {
    console.error('push-reminders: due_push_reminders falló', error.message);
    return NextResponse.json({ error: 'No se pudieron leer los recordatorios.' }, { status: 500 });
  }

  const due = (data ?? []) as DueReminder[];
  let sent = 0;
  const expired: string[] = [];

  // Las suscripciones APNs se envían cuando exista la app de iOS
  for (const r of due.filter((d) => d.platform === 'web' && d.p256dh && d.auth)) {
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh!, auth: r.auth! } },
        JSON.stringify(reminderMessage(r)),
        { TTL: 60 * 60 * 4, urgency: 'normal' }
      );
      sent++;
      await supabase.from('push_subscriptions').update({ last_sent_on: r.local_date }).eq('id', r.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: el navegador dio de baja la suscripción
      if (status === 404 || status === 410) expired.push(r.id);
      else console.error('push-reminders: envío falló', status ?? err);
    }
  }

  if (expired.length) await supabase.from('push_subscriptions').delete().in('id', expired);

  console.log(JSON.stringify({ event: 'push_reminders', due: due.length, sent, expired: expired.length }));
  return NextResponse.json({ due: due.length, sent, expired: expired.length });
}
