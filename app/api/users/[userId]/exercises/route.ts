import { NextResponse } from 'next/server';
import type { CustomExercise, SportId } from '@/domain/types';
import { addCustomExercise } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;
    const body = await req.json();
    const sport = (body.sport as SportId) ?? 'gym';
    const exercise = body.exercise as CustomExercise;
    if (!exercise?.n) return NextResponse.json({ error: 'invalid exercise' }, { status: 400 });
    await addCustomExercise(userId, sport, exercise);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
