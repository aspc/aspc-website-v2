import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get("connect.sid");
    const { pathname } = request.nextUrl;

    // 1. Fix cookie handling
    const authCheck = async () => {
        try {
            if (!sessionCookie) return null;

            const response = await fetch(
                `/api/auth/current_user`,
                {
                    credentials: "include",
                    headers: {
                        Cookie: request.headers.get("Cookie") || "",
                    },
                    cache: "no-store" // Critical for fresh data
                }
            );

            console.log(response);

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    };

    // // 2. Handle /dashboard routes
    // if (pathname.startsWith("/dashboard")) {
    //     if (!sessionCookie) {
    //         return NextResponse.redirect(new URL("/login", request.url));
    //     }

    //     const userData = await authCheck();
        
    //     if (!userData) {
    //         const loginUrl = new URL("/sucks", request.url);
    //         loginUrl.searchParams.set("from", pathname);
    //         return NextResponse.redirect(loginUrl);
    //     }

    //     // 3. Proper admin check with 403 response
    //     if (!userData.user?.isAdmin) {
    //         return new NextResponse("Forbidden", { 
    //             status: 403,
    //             headers: {
    //                 "Content-Type": "text/plain"
    //             }
    //         });
    //     }
    // }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/profile/:path*"],
};