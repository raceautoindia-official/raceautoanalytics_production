import { NextResponse } from 'next/server';

export async function GET(request) {
  // 1️⃣ Parse out the “email” query-param
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json(
      { error: 'Email query param is required' },
      { status: 400 }
    );
  }

  // 2️⃣ Proxy the real API
  const apiRes = await fetch(
    `https://raceautoindia.com/api/subscription/analytics/${encodeURIComponent(email)}`
  );

  // 3️⃣ Return its JSON (and status)
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
