"use client";
import { useState } from "react";
import { Phone, ChevronDown } from "lucide-react";
import type { Prospect } from "@/lib/types";
import { CALL_STEPS, OBJECTIONS, fillScript } from "@/lib/call-script";

export function ScriptPanel({ current }: { current?: Prospect | null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"script" | "objections">("script");
  const vars = {
    entreprise: current?.entreprise ?? "",
    ville: current?.ville ?? "",
    activite: current?.activite ?? "",
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(420px,92vw)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-xl aura-hero text-white px-4 py-2.5 text-sm font-semibold shadow-lg"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {open ? (
            <>
              <ChevronDown className="size-4" aria-hidden />
              Fermer le script
            </>
          ) : (
            <>
              <Phone className="size-4" aria-hidden />
              Script & objections
            </>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTab("script")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tab === "script"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              Script 6 temps
            </button>
            <button
              onClick={() => setTab("objections")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tab === "objections"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              Objections
            </button>
          </div>
          {tab === "script" ? (
            <div className="space-y-3">
              {CALL_STEPS.map((s) => (
                <div key={s.titre}>
                  <div className="font-semibold text-sm text-primary">
                    {s.titre}
                  </div>
                  <div className="text-sm text-foreground/90">
                    {fillScript(s.texte, vars)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {OBJECTIONS.map((o) => (
                <div key={o.question}>
                  <div className="font-semibold text-sm">« {o.question} »</div>
                  <div className="text-sm text-muted-foreground">
                    {o.reponse}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
