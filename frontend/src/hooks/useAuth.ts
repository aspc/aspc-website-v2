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
                    `/api/auth/current_user`,
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
