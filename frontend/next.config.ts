import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
          // Only proxy routes that start with /api/
          {
            source: '/api/:path*',
            destination: 'https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/:path*',
          },
          // Allow all other routes to be handled by Next.js
          {
            source: '/:path*',
            destination: '/:path*',
          }
        ];
      },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "localhost",
                port: "5000",
                pathname: "/api/members/profile-pic/**",
            },
            {
                protocol: "https",  
                hostname: "aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com",
                port: "", 
                pathname: "/api/members/profile-pic/**",
            }
        ],
    },
    env: {
        BACKEND_LINK: process.env.BACKEND_LINK,
        NEXT_PUBLIC_TINYMCE_API_KEY: process.env.NEXT_PUBLIC_TINYMCE_API_KEY,
    },
};

export default nextConfig;
