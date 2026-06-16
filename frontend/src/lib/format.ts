export function humanBytes(num: number | null | undefined, digits = 1): string {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  let n = num;
  for (const unit of ["B", "KB", "MB", "GB", "TB", "PB"]) {
    if (Math.abs(n) < 1024) return `${n.toFixed(digits)} ${unit}`;
    n /= 1024;
  }
  return `${n.toFixed(digits)} EB`;
}

export function bytesPerSec(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  return `${humanBytes(num)}/s`;
}

export function pct(num: number | null | undefined, digits = 1): string {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  return `${num.toFixed(digits)}%`;
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export function mhz(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} GHz`;
  return `${Math.round(value)} MHz`;
}

// Heat scale → a Geist token color for a 0..100 utilisation/usage value.
export function usageColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "var(--ds-gray-600)";
  if (value >= 90) return "var(--ds-red-700)";
  if (value >= 75) return "var(--ds-amber-700)";
  if (value >= 50) return "var(--ds-blue-700)";
  return "var(--ds-green-700)";
}

export function tempColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "var(--ds-gray-600)";
  if (value >= 85) return "var(--ds-red-700)";
  if (value >= 70) return "var(--ds-amber-700)";
  return "var(--ds-green-700)";
}
