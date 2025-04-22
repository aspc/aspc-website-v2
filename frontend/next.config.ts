import type { NextConfig } from 'next';

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
            {
                protocol: 'https',
                hostname: 'localhost',
                port: '5000',
                pathname: '/api/**',
            },
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
