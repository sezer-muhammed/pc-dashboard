import { HostOverview } from "@/components/dashboard/host-overview";
import { ActiveTerminals } from "@/components/dashboard/active-terminals";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <HostOverview />
      <ActiveTerminals />
    </div>
  );
}
