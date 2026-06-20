export const siteConfig = {
  name: "PC Console",
  shortName: "PC",
  tagline: "Local host monitoring & control",
} as const;

export const navItems = [
  { href: "/", label: "Overview", key: "overview" },
  { href: "/diagnostics", label: "System Diagnostics", key: "diagnostics" },
] as const;
