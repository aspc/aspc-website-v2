import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {

    
    // Forward the request to your Express backend
    const response = await fetch(
      `https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/api/auth/current_user`,
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
        credentials: 'include',
      }
    );
    
    const data = await response.json();
    
    // Forward cookies
    const setCookieHeader = response.headers.get('set-cookie');
    const nextResponse = NextResponse.json(data);
    if (setCookieHeader) {
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Auth proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication' },
      { status: 500 }
    );
  }
}