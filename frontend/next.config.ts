import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "5000",
                pathname: "/api/members/profile-pic/**",
            },
        ],
    },
    env: {
        BACKEND_LINK: process.env.BACKEND_LINK,
        NEXT_PUBLIC_TINYMCE_API_KEY: process.env.NEXT_PUBLIC_TINYMCE_API_KEY,
    },
};

export default nextConfig;
