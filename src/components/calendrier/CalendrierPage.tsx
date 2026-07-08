import { useEffect, useMemo, useState } from "react";

import { type ActivitePubliee, listActivitesPubliees, listCartesAvecEcheance, listEspaces } from "../../lib/store.js";
import type { CarteProto, Espace, Priorite } from "../../lib/types.js";
import { EmptyState } from "../common/EmptyState.js";

type CarteCal = CarteProto & { espace_id: string | null };
type ItemCal = { kind: "carte"; carte: CarteCal } | { kind: "activite"; act: ActivitePubliee };

interface Props {
  scopeEspaceId?: string | null;
  onOuvrirCarte?: (espaceId: string, tableauId: string, carteId: string) => void;
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendrierPage({ scopeEspaceId = null, onOuvrirCarte }: Props): JSX.Element {
  const today = new Date();
  const [annee, setAnnee] = useState(today.getFullYear());
  const [mois, setMois] = useState(today.getMonth());
  const [cartes, setCartes] = useState<CarteCal[]>([]);
  const [activites, setActivites] = useState<ActivitePubliee[]>([]);
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [filtreEspace, setFiltreEspace] = useState<string>(scopeEspaceId ?? "tous");
  const [filtreEtiquette, setFiltreEtiquette] = useState<string>("toutes");
  const [filtrePriorite, setFiltrePriorite] = useState<Priorite | "toutes">("toutes");

  useEffect(() => {
    void listCartesAvecEcheance().then(setCartes);
    void listActivitesPubliees().then(setActivites);
    void listEspaces().then(setEspaces);
  }, []);

  const etiquettes = useMemo(() => {
    const src = filtreEspace !== "tous" ? espaces.filter((e) => e.id === filtreEspace) : espaces;
    const map = new Map<string, { id: string; nom: string; couleur: string }>();
    src.forEach((e) => e.etiquettes.forEach((et) => map.set(et.id, et)));
    return [...map.values()];
  }, [espaces, filtreEspace]);

  const cartesFiltrees = useMemo(() => {
    return cartes.filter((c) => {
      if (filtreEspace !== "tous" && c.espace_id !== filtreEspace) return false;
      if (filtreEtiquette !== "toutes" && !c.etiquettes.includes(filtreEtiquette)) return false;
      if (filtrePriorite !== "toutes" && c.priorite !== filtrePriorite) return false;
      return true;
    });
  }, [cartes, filtreEspace, filtreEtiquette, filtrePriorite]);

  // Published activities respect the space filter only: they are real events, not
  // bound to a card's label or priority.
  const activitesFiltrees = useMemo(
    () => activites.filter((a) => filtreEspace === "tous" || a.espace_id === filtreEspace),
    [activites, filtreEspace],
  );

  const grille = useMemo(() => buildGrille(annee, mois), [annee, mois]);
  const parJour = useMemo(() => {
    const m = new Map<string, ItemCal[]>();
    const push = (key: string, item: ItemCal): void => {
      const list = m.get(key) ?? [];
      list.push(item);
      m.set(key, list);
    };
    cartesFiltrees.forEach((c) => {
      if (c.echeance) push(c.echeance.slice(0, 10), { kind: "carte", carte: c });
    });
    activitesFiltrees.forEach((a) => {
      if (a.debut) push(a.debut.slice(0, 10), { kind: "activite", act: a });
    });
    return m;
  }, [cartesFiltrees, activitesFiltrees]);

  function nav(delta: number): void {
    const d = new Date(annee, mois + delta, 1);
    setAnnee(d.getFullYear());
    setMois(d.getMonth());
  }

  const espaceOf = (id: string | null): Espace | undefined => espaces.find((e) => e.id === id);

  return (
    <div className="page page-wide">
      <header className="page-head">
        <h1>Calendrier des activités</h1>
        <p className="muted">Les échéances de vos cartes et les activités publiées, comme dans l'agenda des membres.</p>
      </header>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => nav(-1)} aria-label="Mois précédent">‹</button>
          <strong>{MOIS[mois]} {annee}</strong>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => nav(1)} aria-label="Mois suivant">›</button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => { setAnnee(today.getFullYear()); setMois(today.getMonth()); }}>Aujourd'hui</button>
        </div>
        <div className="cal-filtres">
          {!scopeEspaceId && (
            <label>
              <span className="muted small">Espace</span>
              <select value={filtreEspace} onChange={(e) => setFiltreEspace(e.target.value)}>
                <option value="tous">Tous les espaces</option>
                {espaces.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </label>
          )}
          <label>
            <span className="muted small">Étiquette</span>
            <select value={filtreEtiquette} onChange={(e) => setFiltreEtiquette(e.target.value)}>
              <option value="toutes">Toutes</option>
              {etiquettes.map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </select>
          </label>
          <label>
            <span className="muted small">Priorité</span>
            <select value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value as Priorite | "toutes")}>
              <option value="toutes">Toutes</option>
              <option value="urgente">Urgente</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
          </label>
        </div>
      </div>

      {cartesFiltrees.length === 0 && activitesFiltrees.length === 0 && (
        <EmptyState titre="Aucune activité programmée" description="Ajoutez une échéance à vos cartes, ou publiez une carte en activité, pour les voir apparaître ici." />
      )}

      <div className="cal-grid" role="grid" aria-label={`Calendrier ${MOIS[mois]} ${annee}`}>
        {JOURS.map((j) => <div key={j} className="cal-head">{j}</div>)}
        {grille.map((jour, i) => {
          const key = jour ? isoDate(annee, mois, jour) : `v-${i}`;
          const items = jour ? parJour.get(isoDate(annee, mois, jour)) ?? [] : [];
          const estAujourdhui = jour === today.getDate() && mois === today.getMonth() && annee === today.getFullYear();
          return (
            <div key={key} className={`cal-cell${jour ? "" : " cal-cell-vide"}${estAujourdhui ? " cal-cell-today" : ""}`}>
              {jour && <div className="cal-cell-num">{jour}</div>}
              <div className="cal-cell-items">
                {items.slice(0, 4).map((item) => {
                  if (item.kind === "activite") {
                    const a = item.act;
                    const esp = espaceOf(a.espace_id);
                    return (
                      <button
                        key={`a-${a.id}`}
                        type="button"
                        className="cal-event cal-event-activite"
                        style={{ background: esp?.couleur ?? "#4b5563", color: "#fff" }}
                        onClick={() => onOuvrirCarte && a.espace_id && onOuvrirCarte(a.espace_id, a.tableau_id, a.carte_id)}
                        title={`Activité publiée${esp ? " · " + esp.nom : ""} · ${a.titre}`}
                      >
                        <span className="cal-event-titre">◆ {a.titre}</span>
                      </button>
                    );
                  }
                  const c = item.carte;
                  const esp = espaceOf(c.espace_id);
                  return (
                    <button
                      key={`c-${c.id}`}
                      type="button"
                      className={`cal-event cal-event-${c.priorite}`}
                      style={esp ? { borderLeftColor: esp.couleur } : undefined}
                      onClick={() => onOuvrirCarte && c.espace_id && onOuvrirCarte(c.espace_id, c.tableau_id, c.id)}
                      title={`${esp?.nom ?? ""} · ${c.titre}`}
                    >
                      <span className="cal-event-titre">{c.titre}</span>
                    </button>
                  );
                })}
                {items.length > 4 && <span className="muted small">+{items.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isoDate(a: number, m: number, d: number): string {
  return `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildGrille(annee: number, mois: number): Array<number | null> {
  const premier = new Date(annee, mois, 1);
  const jourSemaine = (premier.getDay() + 6) % 7; // lundi=0
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < jourSemaine; i++) cells.push(null);
  for (let d = 1; d <= nbJours; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
