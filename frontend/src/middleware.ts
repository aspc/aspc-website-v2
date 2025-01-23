import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get("connect.sid");

    // If no session cookie and not on login page, redirect to login
    if (!sessionCookie && !request.nextUrl.pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Additional admin check for dashboard
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
        try {
            if (sessionCookie) {
                const response = await fetch(
                    "${process.env.BackendLink}/api/auth/current_user",
                    {
                        headers: {
                            Cookie: `connect.sid=${sessionCookie.value}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (!data.user.isAdmin) {
                        // Redirect non-admin users to home page
                        return NextResponse.redirect(new URL("/", request.url));
                    }
                } else {
                    return NextResponse.redirect(
                        new URL("/login", request.url)
                    );
                }
            } else {
                return NextResponse.redirect(new URL("/login", request.url));
            }
        } catch (error) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/profile/:path*"],
};
