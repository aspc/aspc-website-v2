import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
          // Only proxy routes that start with /api/
          {
            source: '/api/:path*',
            destination: 'https://aspc-backend-v1.gps54p9mv93tm.us-west-2.cs.amazonlightsail.com/api/:path*',
          },
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
            },
            {
                protocol: "https",  
                hostname: "api.pomonastudents.org",
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
