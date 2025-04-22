'use client';

import { useRouter } from 'next/navigation';

export default function LoginRequired() {
    const router = useRouter();

    const handleLogin = () => {
        window.location.href = `${process.env.BACKEND_LINK}/api/auth/login/saml`;
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
            <div className="p-8 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
                    Login Required
                </h2>
                <p className="text-center mb-6">
                    You need to login to access this page.
                </p>
                <div className="flex justify-center">
                    <button
                        onClick={handleLogin}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                        Login with Pomona
                    </button>
                </div>
            </div>
        </div>
    );
}
