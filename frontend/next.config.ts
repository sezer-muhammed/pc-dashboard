import type { NextConfig } from "next";

// The dashboard calls the Django backend directly (CORS enabled server-side),
// so no rewrite/proxy is needed. Override the target with NEXT_PUBLIC_PC_API.
// Dev origins allowed to load dev resources (HMR, RSC, _next/*). Add your own
// LAN/Tailscale IPs via PC_DEV_ORIGINS (comma-separated) so the dashboard works
// when opened over the network, not just localhost.
const devOrigins = (process.env.PC_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...devOrigins,
  ],
};

export default nextConfig;
