import withPlaiceholder from "@plaiceholder/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  crossOrigin: 'anonymous',
  images: {
    domains: ['raceautonextjs-bucket.s3.ap-south-1.amazonaws.com'],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
   typescript: {
    // 🚨 This makes `next build` succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
};

export default withPlaiceholder(nextConfig);
