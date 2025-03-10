import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from '@/types'; 


export function useAuth(requireAdmin: boolean = false) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(
                    `${process.env.BACKEND_LINK}/api/auth/current_user`, // Local API route 
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
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router, requireAdmin]);


    return { user, loading};
}
