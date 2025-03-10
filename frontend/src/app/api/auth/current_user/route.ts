// app/api/auth/current_user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    // Create a custom agent that ignores certificate errors
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false // WARNING: Only use in development!
    });
    
    // Forward the request to your Express backend
    const backendResponse = await fetch(
      `https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/api/auth/current_user`,
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        // @ts-ignore - Type issue with Node's https.Agent
        agent: httpsAgent
      }
    );
    
    // Rest of your code remains the same
    const data = await backendResponse.json();
    
    const response = NextResponse.json(data, {
      status: backendResponse.status,
    });
    
    const setCookieHeader = backendResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('Set-Cookie', setCookieHeader);
    }
    
    return response;
  } catch (error) {
    console.error('Auth proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication' },
      { status: 500 }
    );
  }
}