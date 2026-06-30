import { useEffect, useState } from "react";

import {
  type Carte,
  type Commentaire,
  addCommentaire,
  getCommentaires,
  publierCarte,
  updateCarte,
} from "../api.js";

interface CardModalProps {
  token: string;
  carte: Carte;
  onClose: () => void;
  onChanged: () => void;
}

const POLL_MS = 4000;

export function CardModal({ token, carte, onClose, onChanged }: CardModalProps): JSX.Element {
  const [titre, setTitre] = useState(carte.titre);
  const [description, setDescription] = useState(carte.description ?? "");
  const [typeActivite, setTypeActivite] = useState(carte.type_activite ?? "");
  const [lieu, setLieu] = useState(carte.lieu ?? "");
  const [datePrevue, setDatePrevue] = useState(toLocalInput(carte.date_prevue));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publie, setPublie] = useState(carte.publie);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [comments, setComments] = useState<Commentaire[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let alive = true;
    const load = (): void => {
      getCommentaires(token, carte.id)
        .then((rows) => alive && setComments(rows))
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [token, carte.id]);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await updateCarte(token, carte.id, {
        titre,
        description,
        type_activite: typeActivite || undefined,
        lieu: lieu || undefined,
        date_prevue: datePrevue ? new Date(datePrevue).toISOString() : undefined,
      });
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function send(): Promise<void> {
    if (!draft.trim()) return;
    const corps = draft.trim();
    setDraft("");
    const created = await addCommentaire(token, carte.id, corps);
    setComments((prev) => [...prev, created]);
  }

  async function publish(): Promise<void> {
    setPublishError(null);
    try {
      await publierCarte(token, carte.id);
      setPublie(true);
      onChanged();
    } catch {
      setPublishError("Publication impossible.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Fiche de preparation</h2>
          <button type="button" className="link" onClick={onClose}>
            Fermer
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-form">
            <label>
              <span>Titre</span>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} />
            </label>
            <label>
              <span>Description</span>
              <textarea className="textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="modal-grid">
              <label>
                <span>Type d'activite</span>
                <input value={typeActivite} onChange={(e) => setTypeActivite(e.target.value)} placeholder="Formation, veillee..." />
              </label>
              <label>
                <span>Lieu</span>
                <input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Salle, chapelle..." />
              </label>
              <label>
                <span>Date prevue</span>
                <input type="datetime-local" value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost btn-inline" disabled={saving} onClick={() => void save()}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              {publie ? (
                <span className="badge badge-ok">Publie en evenement</span>
              ) : (
                <button type="button" className="btn btn-primary btn-inline" onClick={() => void publish()}>
                  Publier en evenement
                </button>
              )}
            </div>
            {savedAt && <p className="muted small">Enregistre a {savedAt}. Une nouvelle version est conservee.</p>}
            {publishError && <p className="banner banner-error">{publishError}</p>}
            {publie && (
              <p className="muted small">L'evenement est cree et sa session de pointage est ouverte.</p>
            )}
          </div>

          <aside className="modal-chat">
            <h3 className="card-title">Discussion</h3>
            <div className="chat-thread">
              {comments.length === 0 && <p className="muted small">Aucun message. Lancez la discussion.</p>}
              {comments.map((c) => (
                <div key={c.id} className="chat-msg">
                  <span className="chat-author">{c.auteur_nom ?? "Comite"}</span>
                  <span className="chat-body">{c.corps}</span>
                  {c.cree_le && <span className="chat-time">{new Date(c.cree_le).toLocaleTimeString("fr-FR")}</span>}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                value={draft}
                placeholder="Ecrire un message..."
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
              />
              <button type="button" className="btn btn-primary btn-inline" disabled={!draft.trim()} onClick={() => void send()}>
                Envoyer
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
