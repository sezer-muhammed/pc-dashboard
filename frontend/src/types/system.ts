// Response shapes from sezer-pc-backend /api/v1/system/*

export type SystemStatus = {
  hostname: string;
  platform: string;
  system: string;
  release: string;
  architecture: string;
  boot_time: string;
  uptime_seconds: number;
  cpu_count_logical: number | null;
  cpu_count_physical: number | null;
  cpu_percent: number;
  load_average: number[] | null;
  memory_total: number;
  memory_available: number;
  memory_used: number;
  memory_percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
};

export type Cpu = {
  count_logical: number | null;
  count_physical: number | null;
  percent: number;
  per_core_percent: number[];
  frequency_mhz: number | null;
  frequency_min_mhz: number | null;
  frequency_max_mhz: number | null;
  per_core_frequency_mhz: (number | null)[];
  load_average: number[] | null;
  times_percent: { user: number; system: number; idle: number; iowait: number | null };
};

export type MemBlock = {
  total: number;
  used: number;
  free: number;
  percent: number;
  available?: number;
  total_human?: string;
  used_human?: string;
};
export type Memory = { virtual: MemBlock; swap: MemBlock };

export type TemperatureReading = {
  chip: string;
  label: string | null;
  current: number | null;
  high: number | null;
  critical: number | null;
};
export type FanReading = { chip: string; label: string | null; rpm: number | null };
export type TemperatureReport = { temperatures: TemperatureReading[]; fans: FanReading[] };

export type Gpu = {
  index: number | null;
  name: string | null;
  temperature_c: number | null;
  utilization_gpu_percent: number | null;
  utilization_memory_percent: number | null;
  memory_total_mb: number | null;
  memory_used_mb: number | null;
  memory_free_mb: number | null;
  power_draw_w: number | null;
  power_limit_w: number | null;
  fan_speed_percent: number | null;
  clock_sm_mhz: number | null;
  clock_memory_mhz: number | null;
};
export type GpuReport = { available: boolean; reason?: string; gpus: Gpu[] };

export type DiskPartition = {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  percent: number;
  total_human: string;
  used_human: string;
  free_human: string;
};
export type DiskIO = {
  device: string;
  read_bytes: number;
  write_bytes: number;
  read_count: number;
  write_count: number;
  busy_time_ms: number | null;
  read_bytes_per_sec?: number;
  write_bytes_per_sec?: number;
  utilization_percent?: number;
};
export type DiskReport = { partitions: DiskPartition[]; io: DiskIO[] };

export type NetworkAddress = { family: string; address: string | null; netmask: string | null };
export type NetworkInterface = {
  name: string;
  is_up: boolean | null;
  speed_mbps: number | null;
  mtu: number | null;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  errin: number;
  errout: number;
  dropin: number;
  dropout: number;
  bytes_sent_per_sec?: number;
  bytes_recv_per_sec?: number;
  addresses: NetworkAddress[];
};

export type StorageNode = {
  name: string;
  path: string;
  type: "dir" | "file";
  size_bytes: number;
  size_human: string;
  error?: string;
  children?: StorageNode[] | null;
};
export type StorageTree = {
  path: string;
  depth: number;
  disk: { total: number; used: number; free: number; percent: number } | null;
  tree: StorageNode;
};
