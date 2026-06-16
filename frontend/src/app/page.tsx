import { HostOverview } from "@/components/dashboard/host-overview";
import { CpuPanel } from "@/components/dashboard/cpu-panel";
import { MemoryPanel } from "@/components/dashboard/memory-panel";
import { NetworkPanel } from "@/components/dashboard/network-panel";
import { GpuPanel } from "@/components/dashboard/gpu-panel";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <HostOverview />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CpuPanel />
        <MemoryPanel />
      </div>
      <GpuPanel />
      <NetworkPanel />
    </div>
  );
}
