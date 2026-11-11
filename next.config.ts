import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.0.10"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
