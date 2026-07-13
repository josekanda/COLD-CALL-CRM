"use client";
import { useState } from "react";
import {
  Phone,
  PhoneOff,
  CalendarClock,
  X,
  Check,
  PartyPopper,
  Lightbulb,
  Trash2,
} from "lucide-react";
import type { Prospect, Status } from "@/lib/types";
import {
  CALL_STEPS,
  fillScript,
  SITE_MORT_TIP,
  BON_OUI,
  angleAppel,
  ANGLE_LABELS,
  ANGLE_PITCH,
} from "@/lib/call-script";
import { telHref, noteLabel } from "@/lib/prospect";
import { safeHttpUrl } from "@/lib/url";

export function CallMode({
  queue,
  restants,
  onStatus,
  onClose,
  onToast,
  onRemove,
}: {
  queue: Prospect[];
  restants: number;
  onStatus: (id: string, s: Status) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
  onRemove: (id: string) => void;
}) {
  const [skipped, setSkipped] = useState<string[]>([]);

  const skippedSet = new Set(skipped);
  const front = queue.filter((p) => !skippedSet.has(p.id));
  const back = skipped
    .map((id) => queue.find((p) => p.id === id))
    .filter((p): p is Prospect => !!p);
  const prospect = [...front, ...back][0] ?? null;

  if (!prospect) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 inline-flex items-center gap-2">
            <PartyPopper className="size-6 text-primary" aria-hidden />
            Plus personne à appeler
          </div>
          <div className="text-muted-foreground mb-4">
            Tous les prospects ont un statut. Importe une nouvelle liste ou
            passe au build.
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-semibold"
          >
            Retour au CRM
          </button>
        </div>
      </div>
    );
  }
  const vars = {
    entreprise: prospect.entreprise,
    ville: prospect.ville,
    activite: prospect.activite,
  };
  const fiche = safeHttpUrl(prospect.lienFiche);
  const angle = angleAppel(prospect.pourquoi);
  const siteMort = angle === "site-mort";
  const act = (s: Status, msg: string) => {
    onStatus(prospect.id, s);
    onToast(msg);
  };
  const passJoint = () => {
    onStatus(prospect.id, "a_appeler");
    setSkipped((prev) => [...prev, prospect.id]);
    onToast("Pas joint — reste à appeler");
  };
  const non = () => {
    onRemove(prospect.id);
    onToast("Rayé");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/97 p-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {restants} prospect(s) à appeler
          </div>
          <button
            onClick={onClose}
            className="text-sm underline text-muted-foreground"
          >
            Quitter le mode appel
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-2xl font-bold">{prospect.entreprise}</div>
            <div className="text-muted-foreground">
              {[prospect.activite, prospect.ville].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-1 text-sm">{noteLabel(prospect)}</div>
            <a
              href={telHref(prospect.tel)}
              className="mt-5 flex items-center justify-center gap-3 rounded-xl aura-hero text-white text-center text-2xl font-bold py-5 tabular"
            >
              <Phone className="size-6" aria-hidden />
              {prospect.tel || "—"}
            </a>
            {fiche && (
              <a
                href={fiche}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-sm underline text-primary"
              >
                Voir la fiche Google
              </a>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={passJoint}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <PhoneOff className="size-4" aria-hidden />
                Pas joint
              </button>
              <button
                onClick={() => act("rdv", "Rappel calé")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <CalendarClock className="size-4" aria-hidden />À rappeler
              </button>
              <button
                onClick={non}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-sm"
              >
                <X className="size-4" aria-hidden />
                Non
              </button>
              <button
                onClick={() => act("qualifie", "OUI ! → file de build")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm"
              >
                <Check className="size-4" aria-hidden />
                OUI
              </button>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Check
                className="size-3.5 shrink-0 mt-0.5 text-primary"
                aria-hidden
              />
              {BON_OUI}
            </p>
            <button
              onClick={() => {
                if (
                  !confirm(`Supprimer définitivement "${prospect.entreprise}" ?`)
                )
                  return;
                onRemove(prospect.id);
                onToast("Prospect supprimé");
              }}
              className="mt-3 flex items-center justify-center gap-1 mx-auto text-xs text-destructive underline-offset-2 hover:underline"
            >
              <Trash2 className="size-3" aria-hidden />
              Supprimer ce prospect
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold">Script</div>
              <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                Angle : {ANGLE_LABELS[angle]}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {ANGLE_PITCH[angle]}
            </div>
            {siteMort && (
              <div className="flex items-start gap-2 rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm">
                <Lightbulb className="size-4 shrink-0 mt-0.5" aria-hidden />
                <span>{SITE_MORT_TIP}</span>
              </div>
            )}
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
        </div>
      </div>
    </div>
  );
}
