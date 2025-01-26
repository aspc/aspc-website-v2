import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get("connect.sid");
    const { pathname } = request.nextUrl;

    // 1. Fix cookie handling
    const authCheck = async () => {
        try {
            const response = await fetch(
                `${process.env.BACKEND_LINK}/api/auth/current_user`,
                {
                    credentials: "include",
                    headers: {
                        // Pass all cookies, not just session
                        Cookie: request.headers.get("Cookie") || ""
                    },
                    cache: "no-store" // Critical for fresh data
                }
            );

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    };

    // 2. Handle /dashboard routes
    if (pathname.startsWith("/dashboard")) {
        if (!sessionCookie) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        const userData = await authCheck();
        
        if (!userData) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // 3. Proper admin check with 403 response
        if (!userData.user?.isAdmin) {
            return new NextResponse("Forbidden", { 
                status: 403,
                headers: {
                    "Content-Type": "text/plain"
                }
            });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/profile/:path*"],
};