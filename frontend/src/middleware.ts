import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get current path
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't need authentication
  // Include your SAML callback path and home page
  const isPublicPath = 
    path === '/' || 
    path.startsWith('/api/auth/') || 
    path.includes('/login/saml') ||
    path.includes('/logout/saml');
  
  // Check for session cookie - adjust the name to match your actual cookie name
  const hasSessionCookie = request.cookies.has('connect.sid') || request.cookies.has('your_session_cookie_name');
  
  // Redirect logic
  if (!isPublicPath && !hasSessionCookie) {
    // Redirect to home page if accessing protected route without auth
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: [
    // Match all paths except static assets, api routes, etc.
    '/((?!_next/static|_next/image|favicon.ico|logo|public).*)',
  ],
};