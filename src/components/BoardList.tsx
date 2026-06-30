import { useState } from "react";

import { type Tableau, createTableau, getTableaux } from "../api.js";
import { useResource } from "../useResource.js";

interface BoardListProps {
  token: string;
  onOpen: (id: string) => void;
}

export function BoardList({ token, onOpen }: BoardListProps): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getTableaux(token), [token]);
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(): Promise<void> {
    if (!nom.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      const board = await createTableau(token, nom.trim());
      setNom("");
      reload();
      onOpen(board.id);
    } catch {
      setFormError("Creation impossible.");
    } finally {
      setBusy(false);
    }
  }

  const boards: Tableau[] = data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableaux de preparation</h1>
          <p className="muted">Calendrier partage du comite. Une activite preparee se publie en evenement.</p>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">Nouveau tableau</h2>
        <div className="toolbar">
          <input
            className="search"
            placeholder="Nom du tableau (ex. Retraite de careme 2026)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
          <button type="button" className="btn btn-primary btn-inline" disabled={busy || !nom.trim()} onClick={() => void create()}>
            {busy ? "Creation..." : "Creer"}
          </button>
        </div>
        {formError && <p className="banner banner-error">{formError}</p>}
      </section>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}

      {!loading && boards.length === 0 && !error && (
        <p className="muted">Aucun tableau pour le moment. Creez le premier ci-dessus.</p>
      )}

      <div className="board-grid">
        {boards.map((b) => (
          <button key={b.id} type="button" className="board-tile" onClick={() => onOpen(b.id)}>
            <span className="board-tile-name">{b.nom}</span>
            {b.description && <span className="board-tile-desc">{b.description}</span>}
            <span className="board-tile-meta">{b.cartes_total} carte(s)</span>
          </button>
        ))}
      </div>
    </div>
  );
}
