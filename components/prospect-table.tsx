"use client";
import type { Prospect, Status, Upsell } from "@/lib/types";
import { STATUSES, UPSELLS } from "@/lib/types";
import {
  cmdFor,
  scoreClass,
  telHref,
  noteLabel,
  messageClient,
  avisUrl,
} from "@/lib/prospect";
import { copyToClipboard } from "@/lib/clipboard";
import { safeHttpUrl } from "@/lib/url";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  CalendarClock,
  Check,
  Globe,
  MessageSquare,
  Star,
} from "lucide-react";
import type { Filter } from "@/components/toolbar";

const scoreBadge = {
  hi: "bg-green-100 text-green-700",
  mid: "bg-amber-100 text-amber-700",
  lo: "bg-muted text-muted-foreground",
} as const;

export function ProspectTable({
  prospects,
  cal,
  onUpdate,
  onStatus,
  onToast,
  filter,
  onFilter,
}: {
  prospects: Prospect[];
  cal: string;
  onUpdate: (id: string, patch: Partial<Prospect>) => void;
  onStatus: (id: string, s: Status) => void;
  onToast: (msg: string) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const copy = (text: string, msg: string) =>
    copyToClipboard(text).then((ok) => ok && onToast(msg));

  if (prospects.length === 0)
    return (
      <div className="text-center text-muted-foreground py-10">
        Aucun prospect dans ce filtre. Importe ton CSV au-dessus.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="px-4 py-3">Prospect</th>
            <th className="px-4 py-3">Note</th>
            <th className="px-4 py-3">Tél</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">
              <label className="flex items-center gap-1.5">
                Statut
                <select
                  aria-label="Filtrer par statut"
                  value={
                    filter === "all" || filter in STATUSES ? filter : "all"
                  }
                  onChange={(e) => onFilter(e.target.value as Filter)}
                  className="rounded-lg border border-input bg-background px-1.5 py-0.5 text-xs font-normal normal-case"
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(STATUSES).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </th>
            <th className="px-4 py-3">Rappel</th>
            <th className="px-4 py-3">Montant</th>
            <th className="px-4 py-3">Site construit</th>
            <th className="px-4 py-3 sticky right-0 z-20 bg-card border-l border-border">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => {
            const site = safeHttpUrl(p.siteUrl);
            const showSite =
              p.status === "qualifie" || p.status === "construit";
            return (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 align-top transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <div className="font-semibold">{p.entreprise}</div>
                  <div className="text-muted-foreground text-xs">
                    {[p.activite, p.ville].filter(Boolean).join(" · ")}
                  </div>
                  <textarea
                    defaultValue={p.notes}
                    placeholder="notes appel…"
                    onBlur={(e) => onUpdate(p.id, { notes: e.target.value })}
                    className="mt-2 w-full min-h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {noteLabel(p) || "–"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a
                    href={telHref(p.tel)}
                    className="underline-offset-2 hover:underline"
                  >
                    {p.tel || "–"}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={`font-bold tabular ${scoreBadge[scoreClass(p.score)]}`}
                  >
                    {p.score || "–"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => onStatus(p.id, e.target.value as Status)}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold"
                  >
                    {Object.entries(STATUSES).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={p.rappelLe ?? ""}
                    onChange={(e) =>
                      onUpdate(p.id, { rappelLe: e.target.value || null })
                    }
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-3">
                  {p.status === "construit" ? (
                    <input
                      type="number"
                      min={0}
                      value={p.montant ?? ""}
                      placeholder="€"
                      onChange={(e) =>
                        onUpdate(p.id, {
                          montant:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-24 rounded-lg border border-input bg-background px-2 py-1 text-xs tabular"
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {showSite ? (
                    <div className="space-y-1">
                      <input
                        type="url"
                        value={p.siteUrl}
                        placeholder="https://…vercel.app"
                        onChange={(e) =>
                          onUpdate(p.id, { siteUrl: e.target.value })
                        }
                        className="w-44 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                      />
                      {site && (
                        <div className="flex flex-wrap gap-1">
                          <a
                            href={site}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                          >
                            <Globe className="size-3" aria-hidden />
                            Voir
                          </a>
                          <button
                            onClick={() =>
                              copy(messageClient(p), "SMS client copié")
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                          >
                            <MessageSquare className="size-3" aria-hidden />
                            SMS client
                          </button>
                        </div>
                      )}
                      {p.status === "construit" && (
                        <div className="space-y-1 mt-1">
                          <input
                            type="text"
                            value={p.placeId}
                            placeholder="place_id Google"
                            onChange={(e) =>
                              onUpdate(p.id, { placeId: e.target.value })
                            }
                            className="w-44 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                          />
                          {p.placeId && (
                            <button
                              onClick={() =>
                                copy(
                                  avisUrl(p.placeId),
                                  "Lien avis copié — envoie-le au client",
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                            >
                              <Star className="size-3" aria-hidden />
                              Lien avis
                            </button>
                          )}
                          <select
                            value={p.upsell}
                            onChange={(e) =>
                              onUpdate(p.id, {
                                upsell: e.target.value as Upsell,
                              })
                            }
                            className="w-44 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                          >
                            {Object.entries(UPSELLS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {k === "aucun" ? "Upsell : aucun" : label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 sticky right-0 z-10 bg-card border-l border-border">
                  <div className="flex flex-wrap gap-1">
                    <a
                      href={telHref(p.tel)}
                      className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                    >
                      <Phone className="size-3" aria-hidden />
                      Appeler
                    </a>
                    <button
                      onClick={() =>
                        cal
                          ? copy(
                              cal,
                              `Lien résa copié — envoie à ${p.entreprise}`,
                            )
                          : onToast("Renseigne ton lien Calendly")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-xs font-semibold"
                    >
                      <CalendarClock className="size-3" aria-hidden />
                      Résa
                    </button>
                    <button
                      onClick={() => {
                        onStatus(p.id, "qualifie");
                        copy(
                          cmdFor(p),
                          "Commande copiée — colle dans Claude Code",
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2 py-1 text-xs font-semibold"
                    >
                      <Check className="size-3" aria-hidden />A dit OUI
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
