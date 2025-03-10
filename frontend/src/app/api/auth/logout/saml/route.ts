// app/api/auth/logout/saml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    
    const response =  await fetch(
      `https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/api/auth/logout/saml`,
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
        redirect: 'manual',
        // @ts-expect-error - Type issue with Node's https.Agent
        agent: httpsAgent
      }
    );
    
    // Get the location for redirect
    const location = response.headers.get('location');
    
    // Create a response that clears cookies
    const redirectResponse = NextResponse.redirect(
      location ||  '/'
    );
    
    // Clear session cookie
    redirectResponse.headers.set(
      'Set-Cookie', 
      'connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None'
    );
    
    return redirectResponse;
  } catch (error) {
    console.error('SAML logout proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}