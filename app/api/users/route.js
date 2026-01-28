// app/api/users/route.js
import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('MySQL Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
