import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProspectTable } from "./prospect-table";
import type { Prospect } from "@/lib/types";

const p = (over: Partial<Prospect>): Prospect => ({
  id: "x",
  entreprise: "Debowski Paysage",
  ville: "Le Bouscat",
  activite: "",
  tel: "06 12 34 56 78",
  note: "",
  nbAvis: "",
  score: "47",
  pourquoi: "",
  lienFiche: "",
  status: "a_appeler",
  notes: "",
  rappelLe: null,
  montant: null,
  siteUrl: "",
  placeId: "",
  upsell: "aucun",
  ...over,
});

const noop = () => {};

describe("ProspectTable — filtre statut", () => {
  it("affiche un select de statut dans l'en-tête, initialisé sur la valeur de filter", () => {
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="qualifie"
        onFilter={noop}
      />,
    );
    const select = screen.getByLabelText("Filtrer par statut");
    expect(select).toHaveValue("qualifie");
  });

  it("retombe sur 'all' quand filter est un chip spécial (rappel/upsell)", () => {
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="rappel"
        onFilter={noop}
      />,
    );
    expect(screen.getByLabelText("Filtrer par statut")).toHaveValue("all");
  });

  it("appelle onFilter avec le statut choisi", () => {
    const onFilter = vi.fn();
    render(
      <ProspectTable
        prospects={[p({})]}
        cal=""
        onUpdate={noop}
        onStatus={noop}
        onToast={noop}
        filter="all"
        onFilter={onFilter}
      />,
    );
    fireEvent.change(screen.getByLabelText("Filtrer par statut"), {
      target: { value: "refus" },
    });
    expect(onFilter).toHaveBeenCalledWith("refus");
  });
});
