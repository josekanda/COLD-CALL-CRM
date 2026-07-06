import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CallMode } from "./call-mode";
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

describe("CallMode — suppression", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle onRemove avec l'id du prospect quand la confirmation est acceptée", () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const onRemove = vi.fn();
    render(
      <CallMode
        prospect={p({ id: "abc" })}
        restants={1}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Supprimer ce prospect/ }),
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Supprimer définitivement "Debowski Paysage" ?',
    );
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("n'appelle pas onRemove quand la confirmation est refusée", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const onRemove = vi.fn();
    render(
      <CallMode
        prospect={p({ id: "abc" })}
        restants={1}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Supprimer ce prospect/ }),
    );
    expect(onRemove).not.toHaveBeenCalled();
  });
});
