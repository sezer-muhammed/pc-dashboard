import type { NextConfig } from "next";

// The dashboard calls the Django backend directly (CORS enabled server-side),
// so no rewrite/proxy is needed. Override the target with NEXT_PUBLIC_PC_API.
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
