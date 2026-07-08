import { useEffect, useState } from "react";

import { listMembres } from "../../lib/store.js";
import { libelleRole, peut, roleDansEspace } from "../../lib/permissions.js";
import type { Espace, Membre, RoleEspace } from "../../lib/types.js";
import { EmptyState } from "../common/EmptyState.js";
import { CalendrierPage } from "../calendrier/CalendrierPage.js";
import { DashboardEspace } from "./DashboardEspace.js";
import { TabMembres } from "./TabMembres.js";
import { TabReglages } from "./TabReglages.js";
import { TabTableaux } from "./TabTableaux.js";

type Onglet = "tableaux" | "calendrier" | "dashboard" | "membres" | "reglages";

interface EspacePageProps {
  espace: Espace;
  moiId: string;
  onChanged: () => void;
  onOuvrirTableau: (id: string) => void;
  onOuvrirCarte?: (espaceId: string, tableauId: string, carteId: string) => void;
}

export function EspacePage({ espace, moiId, onChanged, onOuvrirTableau, onOuvrirCarte }: EspacePageProps): JSX.Element {
  const [onglet, setOnglet] = useState<Onglet>("tableaux");
  const [membres, setMembres] = useState<Membre[]>([]);
  const [viewAs, setViewAs] = useState<RoleEspace | null>(null);

  useEffect(() => {
    void listMembres().then(setMembres);
  }, []);

  const roleReel = roleDansEspace(espace, moiId);
  const roleEffectif: RoleEspace | null = viewAs ?? roleReel;

  if (!peut(espace, roleReel, "voir")) {
    return (
      <div className="page">
        <EmptyState
          titre="Accès refusé"
          description="Vous n'êtes pas membre de cet espace. Demandez un lien d'invitation à un administrateur."
        />
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div className="espace-head">
          <span className="espace-avatar" style={{ background: espace.couleur }} aria-hidden="true">
            {espace.initiale}
          </span>
          <div>
            <h1>{espace.nom}</h1>
            <p className="muted">
              {espace.description}
              <span className="badge badge-mut" style={{ marginLeft: 10 }}>
                {libelleRole(roleEffectif ?? roleReel!)}
                {viewAs && " (simulé)"}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {(
          [
            ["tableaux", "Tableaux"],
            ["calendrier", "Calendrier"],
            ["dashboard", "Tableau de bord"],
            ["membres", "Membres"],
            ["reglages", "Réglages"],
          ] as [Onglet, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={onglet === k}
            type="button"
            className={`tab${onglet === k ? " tab-active" : ""}`}
            onClick={() => setOnglet(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {onglet === "tableaux" && <TabTableaux espace={espace} moiId={moiId} onOuvrir={onOuvrirTableau} />}
        {onglet === "calendrier" && (
          <CalendrierPage scopeEspaceId={espace.id} onOuvrirCarte={onOuvrirCarte} />
        )}
        {onglet === "dashboard" && <DashboardEspace espaceId={espace.id} />}
        {onglet === "membres" && (
          <TabMembres
            espace={espace}
            membres={membres}
            moiId={moiId}
            roleEffectif={roleEffectif}
            onChanged={onChanged}
          />
        )}
        {onglet === "reglages" && (
          <TabReglages
            espace={espace}
            roleReel={roleReel}
            viewAs={viewAs}
            onViewAs={setViewAs}
            onChanged={onChanged}
          />
        )}
      </div>
    </div>
  );
}

