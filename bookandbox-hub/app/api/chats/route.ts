import { NextResponse } from 'next/server';

// Mock API for chat - returns empty array until real LINE integration
export async function GET() {
  return NextResponse.json([]);
}
