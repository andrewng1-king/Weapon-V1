import { NextResponse } from 'next/server';
import { uploadProfileMedia } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;
    const form = await req.formData();
    const kind = form.get('kind') as 'photo' | 'cover';
    const file = form.get('file') as File | null;
    if (!file || !kind) {
      return NextResponse.json({ error: 'kind and file required' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadProfileMedia(userId, kind, buf, file.type || 'image/jpeg');
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
