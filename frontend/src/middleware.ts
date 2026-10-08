import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for session cookie - adjust name to match your actual cookie
    const hasSessionCookie = request.cookies.has('connect.sid');

    if (!hasSessionCookie) {
        // Create redirect URL with login message
        const redirectUrl = new URL('/', request.url);
        redirectUrl.searchParams.set('loginRequired', 'true');

        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
}

// Sections that only verified (logged-in) students can access.
// Everything else on the site is public.
// `:path*` matches the section root and everything below it.
export const config = {
    matcher: [
        '/campus/:path*', // Course, instructor and housing reviews
        '/open-forum/:path*', // Event reviews
        '/vote/:path*',
        '/dashboard/:path*', // Admin dashboard (backend also enforces admin role)
    ],
};
