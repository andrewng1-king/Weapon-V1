import { NextResponse } from 'next/server';
import type { LogEntry, SportId } from '@/domain/types';
import { addWeaponLog } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;
    const body = await req.json();
    const sport = (body.sport as SportId) ?? 'gym';
    const log = body.log as LogEntry;
    if (!log?.id || !log?.ex) {
      return NextResponse.json({ error: 'invalid log' }, { status: 400 });
    }
    await addWeaponLog(userId, sport, log);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as { message?: string; code?: string; details?: string; hint?: string };
    const message = err?.message ?? String(e);
    console.error('[POST /api/users/[userId]/logs]', message, err?.code, err?.details);
    return NextResponse.json(
      { error: message, code: err?.code, details: err?.details },
      { status: 500 },
    );
  }
}
