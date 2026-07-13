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
        queue={[p({ id: "abc" })]}
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
        queue={[p({ id: "abc" })]}
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

describe("CallMode — file d'appel", () => {
  it("affiche le premier prospect de la file", () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
        ]}
        restants={2}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it('"Pas joint" affiche le prospect suivant de la file', () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
          p({ id: "3", entreprise: "Gamma" }),
        ]}
        restants={3}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it('skipper tout le monde reboucle sur le premier skippé', () => {
    render(
      <CallMode
        queue={[
          p({ id: "1", entreprise: "Alpha" }),
          p({ id: "2", entreprise: "Beta" }),
        ]}
        restants={2}
        onStatus={noop}
        onClose={noop}
        onToast={noop}
        onRemove={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ })); // skip Alpha -> Beta
    fireEvent.click(screen.getByRole("button", { name: /Pas joint/ })); // skip Beta -> back to Alpha
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it('"Non" appelle onRemove sans confirmation et n\'appelle pas onStatus', () => {
    const onRemove = vi.fn();
    const onStatus = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <CallMode
        queue={[p({ id: "1", entreprise: "Alpha" })]}
        restants={1}
        onStatus={onStatus}
        onClose={noop}
        onToast={noop}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Non" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith("1");
    expect(onStatus).not.toHaveBeenCalledWith("1", "refus");
    confirmSpy.mockRestore();
  });
});
