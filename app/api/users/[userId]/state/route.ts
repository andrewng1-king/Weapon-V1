import { NextResponse } from 'next/server';
import { loadWeaponState } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;
    const state = await loadWeaponState(userId);
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
