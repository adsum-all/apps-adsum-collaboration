import { useEffect, useRef, useState } from "react";

import { type Carte, type Colonne, createCarte, getTableau, updateCarte } from "../api.js";
import { useResource } from "../useResource.js";
import { CardModal } from "./CardModal.js";

interface BoardProps {
  token: string;
  boardId: string;
}

export function Board({ token, boardId }: BoardProps): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getTableau(token, boardId), [token, boardId]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Light polling so two committee members on the same board converge: a change
  // in one browser appears in the other within ~8s. Read via refs so the single
  // interval never leaks and is paused while a card modal is open (that view
  // polls on its own and we avoid reloading the grid under it).
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const openRef = useRef(openCardId);
  openRef.current = openCardId;
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!openRef.current) reloadRef.current();
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) return <div className="page"><p className="muted">Chargement du tableau...</p></div>;
  if (error) return <div className="page"><p className="banner banner-error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Tableau introuvable.</p></div>;

  const columns = [...data.colonnes].sort((a, b) => a.position - b.position);

  async function move(carte: Carte, direction: -1 | 1): Promise<void> {
    const ordered = columns;
    const idx = ordered.findIndex((c) => c.id === carte.colonne_id);
    const target = ordered[idx + direction];
    if (!target) return;
    await updateCarte(token, carte.id, { colonne_id: target.id });
    reload();
  }

  const openCard = data.cartes.find((c) => c.id === openCardId) ?? null;

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>{data.nom}</h1>
          <p className="muted">{data.description ?? "Préparez, discutez, puis publiez l'activité en événement."}</p>
        </div>
      </header>

      <div className="kanban">
        {columns.map((col) => (
          <Column
            key={col.id}
            token={token}
            boardId={boardId}
            column={col}
            cards={data.cartes.filter((c) => c.colonne_id === col.id).sort((a, b) => a.position - b.position)}
            isFirst={col.position === columns[0]?.position}
            isLast={col.position === columns[columns.length - 1]?.position}
            onCreated={reload}
            onOpen={setOpenCardId}
            onMove={move}
          />
        ))}
      </div>

      {openCard && (
        <CardModal
          token={token}
          carte={openCard}
          onClose={() => setOpenCardId(null)}
          onChanged={() => {
            reload();
          }}
        />
      )}
    </div>
  );
}

interface ColumnProps {
  token: string;
  boardId: string;
  column: Colonne;
  cards: Carte[];
  isFirst: boolean;
  isLast: boolean;
  onCreated: () => void;
  onOpen: (id: string) => void;
  onMove: (carte: Carte, direction: -1 | 1) => void;
}

function Column({ token, boardId, column, cards, isFirst, isLast, onCreated, onOpen, onMove }: ColumnProps): JSX.Element {
  const [titre, setTitre] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    if (!titre.trim()) return;
    setBusy(true);
    try {
      await createCarte(token, { tableau_id: boardId, colonne_id: column.id, titre: titre.trim() });
      setTitre("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="kanban-col">
      <header className="kanban-col-head">
        <span>{column.nom}</span>
        <span className="kanban-count">{cards.length}</span>
      </header>
      <div className="kanban-cards">
        {cards.map((c) => (
          <article key={c.id} className="kanban-card">
            <button type="button" className="kanban-card-main" onClick={() => onOpen(c.id)}>
              <span className="kanban-card-title">{c.titre}</span>
              {c.lieu && <span className="kanban-card-sub">{c.lieu}</span>}
              <span className="kanban-card-tags">
                {c.publie && <span className="badge badge-ok">Publie</span>}
                {c.date_prevue && <span className="badge badge-mut">{formatDate(c.date_prevue)}</span>}
              </span>
            </button>
            <div className="kanban-card-move">
              <button type="button" aria-label="Vers la gauche" disabled={isFirst} onClick={() => onMove(c, -1)}>
                {"‹"}
              </button>
              <button type="button" aria-label="Vers la droite" disabled={isLast} onClick={() => onMove(c, 1)}>
                {"›"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="kanban-add">
        <input
          value={titre}
          placeholder="+ Ajouter une carte"
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
        />
        {titre.trim() && (
          <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void add()}>
            Ajouter
          </button>
        )}
      </div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
