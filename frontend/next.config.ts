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
        BACKEND_LINK: "http://localhost:5000",
    },
};

export default nextConfig;
