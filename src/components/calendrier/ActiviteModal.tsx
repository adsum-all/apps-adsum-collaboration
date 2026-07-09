import { useEffect, useState } from "react";

import {
  type EvenementDetail,
  annulerActivite,
  detailActivite,
  peutGererActivites,
} from "../../lib/store.js";
import { ActiviteFormComplet } from "./ActiviteFormComplet.js";

interface Props {
  activiteId: string;
  onClose: () => void;
  onChanged: () => void;
}

// View / edit / cancel one activity with the FULL form, whatever app created it
// (parity with the back office). The same shared evenement row, so a change shows
// in every calendar.
export function ActiviteModal({ activiteId, onClose, onChanged }: Props): JSX.Element {
  const [detail, setDetail] = useState<EvenementDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const peutGerer = peutGererActivites();

  useEffect(() => {
    detailActivite(activiteId)
      .then(setDetail)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Activité indisponible"));
  }, [activiteId]);

  async function annuler(): Promise<void> {
    if (!window.confirm("Annuler cette activité ? Elle disparaîtra de tous les calendriers.")) return;
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
        style={{ background: "var(--bg, #fff)", color: "var(--fg, #111)", borderRadius: 12, padding: 20, width: "min(680px, 94vw)", maxHeight: "90vh", overflow: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{peutGerer ? "Modifier l'activité" : "Activité"}</h2>
          <button type="button" className="btn btn-ghost btn-inline" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        {!detail && !err && <p className="muted">Chargement…</p>}
        {err && <p className="small" style={{ color: "var(--danger, #c0392b)" }}>{err}</p>}

        {detail && detail.annule && <p className="small" style={{ color: "var(--danger, #c0392b)" }}>Cette activité est annulée.</p>}

        {detail && peutGerer && (
          <>
            <ActiviteFormComplet detail={detail} onDone={() => { onChanged(); onClose(); }} onCancel={onClose} />
            {!detail.annule && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border, #e2e2e2)", paddingTop: 10 }}>
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void annuler()}>
                  Annuler l'activité
                </button>
              </div>
            )}
          </>
        )}

        {detail && !peutGerer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p><strong>{detail.titre}</strong></p>
            <p className="muted small">{detail.type ?? ""} · {new Date(detail.debut).toLocaleString("fr-FR")}{detail.lieu ? " · " + detail.lieu : ""}</p>
            <p className="muted small">Vous pouvez consulter cette activité. Sa modification demande le droit « collaboration : gérer ».</p>
          </div>
        )}
      </div>
    </div>
  );
}
