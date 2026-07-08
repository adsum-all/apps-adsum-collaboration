import { useEffect, useState } from "react";

import {
  type ActiviteDetailData,
  annulerActivite,
  detailActivite,
  modifierActivite,
  peutGererActivites,
} from "../../lib/store.js";

interface Props {
  activiteId: string;
  onClose: () => void;
  onChanged: () => void;
}

const TYPES = [
  ["rassemblement", "Rassemblement"],
  ["formation", "Formation"],
  ["priere", "Prière"],
] as const;

// View / edit / cancel one activity from the collaboration app. The same evenement
// row as the back office, so a change here shows in every calendar. Editing is
// allowed to any account holding collaboration.gerer, whatever app created the
// activity (parity with the back office).
export function ActiviteModal({ activiteId, onClose, onChanged }: Props): JSX.Element {
  const [data, setData] = useState<ActiviteDetailData | null>(null);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("rassemblement");
  const [date, setDate] = useState("");
  const [lieu, setLieu] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const peutGerer = peutGererActivites();

  useEffect(() => {
    detailActivite(activiteId)
      .then((d) => {
        setData(d);
        setTitre(d.titre);
        setType(d.type ?? "rassemblement");
        setDate(d.debut ? d.debut.slice(0, 10) : "");
        setLieu(d.lieu ?? "");
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Activité indisponible"));
  }, [activiteId]);

  async function enregistrer(): Promise<void> {
    setErr(null);
    setBusy(true);
    try {
      await modifierActivite(activiteId, {
        titre: titre.trim(),
        type,
        debut: date ? new Date(date).toISOString() : undefined,
        lieu: lieu.trim() || null,
      });
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Activité non modifiée");
    } finally {
      setBusy(false);
    }
  }

  async function annuler(): Promise<void> {
    if (!window.confirm("Annuler cette activité ? Elle disparaîtra de tous les calendriers.")) return;
    setErr(null);
    setBusy(true);
    try {
      await annulerActivite(activiteId);
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annulation impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg, #fff)", color: "var(--fg, #111)", borderRadius: 12, padding: 20, width: "min(520px, 92vw)", maxHeight: "88vh", overflow: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Activité</h2>
          <button type="button" className="btn btn-ghost btn-inline" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        {!data && !err && <p className="muted">Chargement…</p>}
        {err && <p className="small" style={{ color: "var(--danger, #c0392b)" }}>{err}</p>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.annule && <p className="small" style={{ color: "var(--danger, #c0392b)" }}>Cette activité est annulée.</p>}
            <label>
              <span className="muted small">Titre</span>
              <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} disabled={!peutGerer} />
            </label>
            <label>
              <span className="muted small">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!peutGerer}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                {!TYPES.some(([v]) => v === type) && <option value={type}>{type}</option>}
              </select>
            </label>
            <label>
              <span className="muted small">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!peutGerer} />
            </label>
            <label>
              <span className="muted small">Lieu</span>
              <input type="text" value={lieu} onChange={(e) => setLieu(e.target.value)} disabled={!peutGerer} placeholder="Optionnel" />
            </label>

            {peutGerer ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <button type="button" className="btn btn-primary" disabled={busy || !titre.trim()} onClick={() => void enregistrer()}>
                  {busy ? "..." : "Enregistrer"}
                </button>
                {!data.annule && (
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void annuler()}>
                    Annuler l'activité
                  </button>
                )}
              </div>
            ) : (
              <p className="muted small">Vous pouvez consulter cette activité. Sa modification demande le droit « collaboration : gérer ».</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
