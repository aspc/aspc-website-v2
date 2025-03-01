import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
}

export function useAuth(requireAdmin: boolean = false) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/auth/current_user`,
                    {
                        credentials: "include",
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (requireAdmin && !data.user.isAdmin) {
                        router.push("/");
                        return;
                    }
                    setUser(data.user);
                }
            } catch (error) {
                console.error("Auth check error:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, requireAdmin]);


    // const logout = async () => {
    //     try {
    //         const response = await fetch(
    //             `${process.env.BACKEND_LINK}/api/auth/logout`,
    //             {
    //                 method: "POST",
    //                 credentials: "include",
    //             }
    //         );

    //         if (response.ok) {
    //             setUser(null);
    //             setTimeout(() => router.push("/login"), 1000);
    //         }
    //     } catch (error) {
    //         console.error("Logout error:", error);
    //     }
    // };

    return { user, loading};
}
