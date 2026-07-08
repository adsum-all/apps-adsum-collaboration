import { useEffect, useMemo, useState } from "react";

import { type CarteCalendrier, getCalendrier } from "../api.js";

interface CalendarProps {
  token: string;
  onOpenBoard: (tableauId: string) => void;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Month grid of planned committee activities. A committee member programs an
 * activity by giving a card a date; it shows up here without any admin access. */
export function Calendar({ token, onOpenBoard }: CalendarProps): JSX.Element {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [activites, setActivites] = useState<CarteCalendrier[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const { year, month } = cursor;

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    setErreur(null);
    const debut = new Date(year, month, 1).toISOString();
    const fin = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    getCalendrier(token, debut, fin)
      .then((rows) => {
        if (vivant) setActivites(rows);
      })
      .catch(() => {
        if (vivant) setErreur("Calendrier indisponible pour le moment.");
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [token, year, month]);

  // Activities grouped by day-of-month (1-based), each sorted by time.
  const parJour = useMemo(() => {
    const map = new Map<number, CarteCalendrier[]>();
    for (const a of activites) {
      const d = new Date(a.date_prevue);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const jour = d.getDate();
      const liste = map.get(jour) ?? [];
      liste.push(a);
      map.set(jour, liste);
    }
    return map;
  }, [activites, year, month]);

  // Cells: leading blanks so the 1st lands under the right weekday (Monday-first).
  const cells = useMemo(() => {
    const premier = new Date(year, month, 1);
    const decalage = (premier.getDay() + 6) % 7; // 0 = Monday
    const nbJours = new Date(year, month + 1, 0).getDate();
    const out: Array<number | null> = [];
    for (let i = 0; i < decalage; i += 1) out.push(null);
    for (let j = 1; j <= nbJours; j += 1) out.push(j);
    return out;
  }, [year, month]);

  const aujourdHui = new Date();
  const estAujourdHui = (jour: number): boolean =>
    aujourdHui.getFullYear() === year && aujourdHui.getMonth() === month && aujourdHui.getDate() === jour;

  const changerMois = (delta: number): void => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const heure = (iso: string): string =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="cal">
      <header className="cal-head">
        <div className="cal-title">
          <h2>{MOIS[month]} {year}</h2>
          <p className="muted small">Activités programmées du comité. Datez une carte pour la planifier ici.</p>
        </div>
        <div className="cal-nav">
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => changerMois(-1)}>
            Mois précédent
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            onClick={() => {
              const now = new Date();
              setCursor({ year: now.getFullYear(), month: now.getMonth() });
            }}
          >
            Aujourd&apos;hui
          </button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => changerMois(1)}>
            Mois suivant
          </button>
        </div>
      </header>

      {erreur && <p className="banner banner-error">{erreur}</p>}

      <div className="cal-grid cal-weekdays" aria-hidden="true">
        {JOURS.map((j) => (
          <div key={j} className="cal-weekday">{j}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((jour, i) => {
          if (jour === null) return <div key={`v-${i}`} className="cal-cell cal-cell-empty" />;
          const items = parJour.get(jour) ?? [];
          return (
            <div key={jour} className={`cal-cell${estAujourdHui(jour) ? " cal-cell-today" : ""}`}>
              <span className="cal-daynum">{jour}</span>
              <div className="cal-items">
                {items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`cal-item${a.publie ? " cal-item-pub" : ""}`}
                    title={`${a.titre}${a.lieu ? " - " + a.lieu : ""} (${a.tableau_nom})`}
                    onClick={() => onOpenBoard(a.tableau_id)}
                  >
                    <span className="cal-item-time">{heure(a.date_prevue)}</span>
                    <span className="cal-item-titre">{a.titre}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!chargement && activites.length === 0 && !erreur && (
        <p className="muted small center cal-vide">
          Aucune activité datée ce mois. Ouvrez un tableau, créez une carte et donnez-lui une date prévue.
        </p>
      )}
    </section>
  );
}
