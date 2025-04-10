import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get current path
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't need authentication
  const isPublicPath = 
    path === '/' || 
    path.startsWith('/api/') || 
    path.includes('/login/saml') ||
    path.includes('/logout/saml') ||
    path.startsWith('/_next/') ||
    path.includes('.ico') || 
    path.includes('.png') ||
    path.includes('.jpg');
  
  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check for session cookie - adjust name to match your actual cookie
  const hasSessionCookie = request.cookies.has('connect.sid');
  
  // Redirect logic
  if (!hasSessionCookie) {
    // Create redirect URL with login message
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('loginRequired', 'true');
    
    return NextResponse.redirect(redirectUrl);
  }
  
  return NextResponse.next();
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo|public).*)',
  ],
};