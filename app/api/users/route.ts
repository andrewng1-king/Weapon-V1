import { NextResponse } from 'next/server';
import { listUsers, createUser } from '@/infrastructure/supabase/workoutService';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username required' }, { status: 400 });
    }
    const user = await createUser(username.trim());
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
