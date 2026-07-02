import type { Prospect } from "@/lib/types";
import { counts, caDuMois } from "@/lib/store";
import { NumberTicker } from "@/components/ui/number-ticker";

function Kpi({
  n,
  label,
  accent,
  suffix,
}: {
  n: number;
  label: string;
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <div
      className={`flex-1 min-w-[120px] rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-md ${
        accent ? "border-primary/40 ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>
        <NumberTicker value={n} suffix={suffix} />
      </div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

export function KpiBar({ prospects }: { prospects: Prospect[] }) {
  const c = counts(prospects);
  const ca = caDuMois(prospects);
  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <Kpi n={c.a_appeler} label="À appeler" />
      <Kpi n={c.rdv} label="RDV réservés" />
      <Kpi n={c.qualifie} label="OUI · à construire" />
      <Kpi n={c.construit} label="Sites construits" />
      <Kpi n={ca} suffix=" €" label="CA encaissé" accent />
    </div>
  );
}
