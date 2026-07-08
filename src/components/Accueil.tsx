import { useEffect, useState } from "react";

import { type CarteCalendrier, type EspaceResume, type Tableau, getCalendrier, getTableaux } from "../api.js";
import type { Route } from "./Sidebar.js";

interface AccueilProps {
  token: string;
  nom: string;
  espaces: EspaceResume[];
  onNavigate: (r: Route) => void;
}

interface Stats {
  espaces: number;
  tableaux: number;
  cartes: number;
  enRetard: number;
}

/** Home dashboard, ported from the prototype. KPIs are computed from real data
 * (boards and dated activities), never seeded. The spaces panel fills in once the
 * space backend is live. */
export function Accueil({ token, nom, espaces, onNavigate }: AccueilProps): JSX.Element {
  const [tableaux, setTableaux] = useState<Tableau[]>([]);
  const [stats, setStats] = useState<Stats>({ espaces: 0, tableaux: 0, cartes: 0, enRetard: 0 });
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    const debut = new Date(Date.now() - 366 * 86400000).toISOString();
    const fin = new Date(Date.now() + 366 * 86400000).toISOString();
    Promise.all([getTableaux(token), getCalendrier(token, debut, fin).catch(() => [] as CarteCalendrier[])])
      .then(([tabs, activites]) => {
        if (!vivant) return;
        setTableaux(tabs);
        const now = Date.now();
        const enRetard = activites.filter((a) => !a.publie && new Date(a.date_prevue).getTime() < now).length;
        const cartes = tabs.reduce((n, t) => n + (t.cartes_total ?? 0), 0);
        setStats({ espaces: espaces.length, tableaux: tabs.length, cartes, enRetard });
      })
      .catch(() => undefined)
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, [token, espaces.length]);

  const kpis = [
    { label: "Espaces", value: stats.espaces },
    { label: "Tableaux", value: stats.tableaux },
    { label: "Cartes actives", value: stats.cartes },
    { label: "En retard", value: stats.enRetard, alerte: stats.enRetard > 0 },
  ];

  return (
    <section className="accueil">
      <header className="page-head">
        <div>
          <h1>Bonjour, {nom}</h1>
          <p className="muted">Vos espaces de collaboration, vos échéances et l&apos;activité récente.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate({ kind: "comite" })}>
          Ouvrir les tableaux
        </button>
      </header>

      <div className="kpi-row">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi${k.alerte ? " kpi-alerte" : ""}`}>
            <span className="kpi-value">{chargement ? "..." : k.value}</span>
            <span className="kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Mes espaces</h2>
        </div>
        {espaces.length === 0 ? (
          <p className="muted small">
            Aucun espace pour le moment. Les espaces de collaboration (coordination, intendance, commissions) seront
            disponibles ici.
          </p>
        ) : (
          <div className="tile-row">
            {espaces.map((e) => (
              <button key={e.id} type="button" className="tile" onClick={() => onNavigate({ kind: "espace", id: e.id })}>
                <span className="tile-badge" style={{ background: e.couleur }}>{e.initiale}</span>
                <span className="tile-nom">{e.nom}</span>
                {e.description && <span className="tile-desc">{e.description}</span>}
                <span className="tile-meta">{e.nb_membres} membre(s)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Tableaux récents</h2>
          <button type="button" className="link" onClick={() => onNavigate({ kind: "comite" })}>Voir tout</button>
        </div>
        {tableaux.length === 0 ? (
          <p className="muted small">Aucun tableau. Créez-en un depuis la vue Tableaux du comité.</p>
        ) : (
          <div className="tile-row">
            {tableaux.slice(0, 6).map((t) => (
              <button key={t.id} type="button" className="tile" onClick={() => onNavigate({ kind: "tableau", id: t.id })}>
                <span className="tile-nom">{t.nom}</span>
                {t.description && <span className="tile-desc">{t.description}</span>}
                <span className="tile-meta">{t.cartes_total} carte(s)</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
