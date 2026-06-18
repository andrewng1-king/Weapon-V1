import { NextResponse } from 'next/server';
import { deleteWeaponLog } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await ctx.params;
    const userId = new URL(_req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    await deleteWeaponLog(userId, logId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
