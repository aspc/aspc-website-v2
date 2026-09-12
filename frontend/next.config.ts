import type { NextConfig } from 'next';

// The backend port is configurable (backend/.env PORT), because macOS AirPlay
// Receiver claims port 5000. Derive the allowed localhost image host from
// BACKEND_LINK so images keep loading whatever port the backend runs on.
const localhostImagePatterns = (() => {
    try {
        const { hostname, port, protocol } = new URL(
            process.env.BACKEND_LINK ?? 'https://localhost:5000'
        );
        if (hostname !== 'localhost') return [];
        const resolvedPort = port || (protocol === 'https:' ? '443' : '80');
        return [
            {
                protocol: 'http' as const,
                hostname: 'localhost',
                port: resolvedPort,
                pathname: '/api/**',
            },
            {
                protocol: 'https' as const,
                hostname: 'localhost',
                port: resolvedPort,
                pathname: '/api/**',
            },
        ];
    } catch {
        return [];
    }
})();

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            // Proxy all API routes to backend
            {
                source: '/api/:path*',
                destination:
                    'https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/api/:path*',
            },
        ];
    },
    images: {
        remotePatterns: [
            ...localhostImagePatterns,
            {
                protocol: 'https',
                hostname:
                    'aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com',
                port: '',
                pathname: '/api/**',
            },
            {
                protocol: 'https',
                hostname: 'api.pomonastudents.org',
                port: '',
                pathname: '/api/**',
            },
        ],
    },
    env: {
        BACKEND_LINK: process.env.BACKEND_LINK,
        NEXT_PUBLIC_TINYMCE_API_KEY: process.env.NEXT_PUBLIC_TINYMCE_API_KEY,
    },
};

export default nextConfig;
