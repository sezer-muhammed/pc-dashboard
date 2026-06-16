import type { NextConfig } from "next";

// The dashboard calls the Django backend directly (CORS enabled server-side),
// so no rewrite/proxy is needed. Override the target with NEXT_PUBLIC_PC_API.
// Dev origins allowed to load dev resources (HMR, RSC, _next/*). Include the
// LAN/Tailscale IPs so the dashboard works when opened over the network, not
// just localhost. Add more hosts here (or via PC_DEV_ORIGINS, comma-separated).
const devOrigins = (process.env.PC_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "100.77.152.99",
    "10.225.159.142",
    ...devOrigins,
  ],
};

export default nextConfig;
