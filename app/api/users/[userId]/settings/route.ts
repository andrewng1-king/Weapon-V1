import { NextResponse } from 'next/server';
import type { WeaponState } from '@/domain/types';
import { saveWeaponSettings } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;
    const state = (await req.json()) as WeaponState;
    await saveWeaponSettings(userId, state);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
