import { DESCRIPTOR_META } from "@/lib/constants";
import { formatNumber } from "@/lib/domain";
import type { MolecularDescriptors } from "@/lib/types";

export function DescriptorGrid({
  descriptors,
}: {
  descriptors: MolecularDescriptors;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {DESCRIPTOR_META.map((d) => (
        <div
          key={d.key}
          className="rounded-md border border-border bg-background/40 px-3 py-2"
        >
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {d.label}
          </div>
          <div className="font-mono text-lg font-semibold">
            {formatNumber(descriptors[d.key], d.precision)}
            {d.unit && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {d.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
