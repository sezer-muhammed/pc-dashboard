import { CpuPanel } from "@/components/dashboard/cpu-panel";
import { MemoryPanel } from "@/components/dashboard/memory-panel";
import { TemperaturePanel } from "@/components/dashboard/temperature-panel";
import { GpuPanel } from "@/components/dashboard/gpu-panel";
import { DiskPanel } from "@/components/dashboard/disk-panel";
import { NetworkPanel } from "@/components/dashboard/network-panel";
import { StoragePanel } from "@/components/dashboard/storage-panel";

export default function DiagnosticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">real-time</p>
        <h1 className="text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">System Diagnostics</h1>
        <p className="mt-1 text-[13px] text-[var(--ds-gray-900)]">
          Live host telemetry — nothing is persisted. Each panel polls the backend and refreshes in place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CpuPanel />
        <MemoryPanel />
        <TemperaturePanel />
        <GpuPanel />
      </div>
      <DiskPanel />
      <NetworkPanel />
      <StoragePanel />
    </div>
  );
}
