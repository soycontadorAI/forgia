import type { SupabaseClient } from '@supabase/supabase-js';

export type RateLimitedAction =
  | 'generate_wod'
  | 'generate_program'
  | 'weekly_analysis'
  | 'chat'
  | 'assessment';

const DAILY_LIMITS: Record<RateLimitedAction, number> = {
  generate_wod: 5,
  generate_program: 2,
  weekly_analysis: 5,
  chat: 20,
  assessment: 10,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: RateLimitedAction
): Promise<RateLimitResult> {
  const limit = DAILY_LIMITS[action];

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  // Role lookup and usage count in parallel (count is ignored for admins)
  const [{ data: profile }, { count, error }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single(),
    supabase
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', twentyFourHoursAgo.toISOString()),
  ]);

  // Admin bypass: unlimited usage
  if (profile?.role === 'admin') {
    return { allowed: true, remaining: 999, limit };
  }

  if (error) {
    console.error('Rate limit check failed:', error);
    // Fail open: allow the request if the check fails
    return { allowed: true, remaining: limit, limit };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    limit,
  };
}

export async function trackUsage(
  supabase: SupabaseClient,
  userId: string,
  action: RateLimitedAction
): Promise<void> {
  const { error } = await supabase
    .from('usage_tracking')
    .insert({ user_id: userId, action });

  if (error) {
    console.error('Failed to track usage:', error);
  }
}
