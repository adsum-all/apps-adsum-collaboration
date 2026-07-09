import { useEffect, useState } from "react";

import {
  type Cibles,
  type EvenementDetail,
  type EvenementPayload,
  creerActivite,
  listCibles,
  modifierActivite,
} from "../../lib/store.js";

// The full activity/event form, reproduced from the back office so an activity can
// be programmed or edited from collaboration with EXACTLY the same fields (title,
// zone, start/end, place, type, mode, diffusion, visibility, volet, response
// window, full targeting and recurrence). It reaches the same shared engine, so the
// activity behaves identically wherever it was created.

const FUSEAUX: [string, string][] = [
  ["Africa/Abidjan", "Abidjan (GMT+0)"],
  ["Africa/Lagos", "Lagos (GMT+1)"],
  ["Europe/Paris", "Paris (GMT+1/+2)"],
  ["Europe/London", "Londres (GMT+0/+1)"],
  ["America/New_York", "New York (GMT-5/-4)"],
  ["America/Montreal", "Montréal (GMT-5/-4)"],
];

const CIBLE_LABELS: Record<string, string> = {
  general: "Toute la communauté (général)",
  coordination: "Coordination",
  commission: "Commission / Mission",
  intendance: "Intendance",
  tribu: "Tribu",
  bergers: "Les Bergers",
  responsables: "Les responsables (avec fonction)",
  liste: "Liste d'adresses e-mail (groupe ad hoc)",
};
const CIBLE_UNITES = ["coordination", "commission", "intendance", "tribu"];

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  detail: EvenementDetail | null; // null = create
  onDone: () => void;
  onCancel: () => void;
}

export function ActiviteFormComplet({ detail, onDone, onCancel }: Props): JSX.Element {
  const [titre, setTitre] = useState(detail?.titre ?? "");
  const [zone, setZone] = useState(detail?.fuseau_horaire ?? "Africa/Abidjan");
  const [debut, setDebut] = useState(isoToLocal(detail?.debut ?? null));
  const [fin, setFin] = useState(isoToLocal(detail?.fin ?? null));
  const [lieu, setLieu] = useState(detail?.lieu ?? "");
  const [type, setType] = useState(detail?.type ?? "rassemblement");
  const [mode, setMode] = useState(detail?.mode ?? "presentiel");
  const [diffusion, setDiffusion] = useState(detail?.type_diffusion ?? "aucun");
  const [visibilite, setVisibilite] = useState(detail?.visibilite ?? "membres");
  const [volet, setVolet] = useState(detail?.volet ?? "A");
  const [fenetre, setFenetre] = useState(detail?.fenetre_reponse_heures != null ? String(detail.fenetre_reponse_heures) : "");
  const [cibleType, setCibleType] = useState(detail?.cible_type ?? "general");
  const [cibleId, setCibleId] = useState<string | null>(detail?.cible_id ?? null);
  const [cibleGenre, setCibleGenre] = useState(detail?.cible_genre ?? "");
  const [ageMin, setAgeMin] = useState(detail?.cible_age_min != null ? String(detail.cible_age_min) : "");
  const [ageMax, setAgeMax] = useState(detail?.cible_age_max != null ? String(detail.cible_age_max) : "");
  const [emailsTexte, setEmailsTexte] = useState((detail?.cible_emails ?? []).join("\n"));
  const [liens, setLiens] = useState<string[]>(
    detail?.liens && detail.liens.length > 0 ? detail.liens : detail?.lien_session ? [detail.lien_session] : [""],
  );
  const [repeter, setRepeter] = useState("0"); // extra weekly occurrences (create only)
  const [toucherSerie, setToucherSerie] = useState(false);
  const [cibles, setCibles] = useState<Cibles | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estEdition = detail !== null;
  const estSerie = Boolean(detail?.serie_id);

  useEffect(() => {
    void listCibles().then(setCibles).catch(() => setCibles(null));
  }, []);

  const options: { id: string; nom: string }[] =
    cibleType === "coordination" ? (cibles?.coordinations ?? [])
      : cibleType === "commission" ? (cibles?.commissions ?? [])
        : cibleType === "intendance" ? (cibles?.intendances ?? [])
          : cibleType === "tribu" ? (cibles?.tribus ?? []) : [];

  async function save(): Promise<void> {
    if (!titre.trim() || !debut) {
      setError("Le titre et la date de début sont obligatoires.");
      return;
    }
    if (CIBLE_UNITES.includes(cibleType) && !cibleId) {
      setError("Choisissez l'unité ciblée ou repassez sur « général ».");
      return;
    }
    const emails = cibleType === "liste"
      ? emailsTexte.split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
      : [];
    if (cibleType === "liste" && emails.length === 0) {
      setError("Ajoutez au moins une adresse e-mail pour un ciblage par liste.");
      return;
    }
    const cleanLiens = liens.map((l) => l.trim()).filter(Boolean);
    const debutIso = new Date(debut).toISOString();
    const payload: EvenementPayload = {
      titre: titre.trim(),
      volet,
      debut: debutIso,
      type,
      mode,
      type_diffusion: diffusion as EvenementPayload["type_diffusion"],
      visibilite: visibilite as EvenementPayload["visibilite"],
      cible_type: cibleType as EvenementPayload["cible_type"],
      cible_id: CIBLE_UNITES.includes(cibleType) ? cibleId : null,
      cible_genre: (cibleGenre || null) as EvenementPayload["cible_genre"],
      cible_age_min: ageMin ? Number(ageMin) : null,
      cible_age_max: ageMax ? Number(ageMax) : null,
      cible_emails: emails,
      fenetre_reponse_heures: fenetre ? Number(fenetre) : null,
      fuseau_horaire: zone,
    };
    if (fin) payload.fin = new Date(fin).toISOString();
    if (lieu.trim()) payload.lieu = lieu.trim();
    if (cleanLiens.length > 0) {
      payload.liens = cleanLiens;
      payload.lien_session = cleanLiens[0];
    }
    // Recurrence (create only): repeat weekly N extra times.
    const n = Number(repeter) || 0;
    if (!estEdition && n > 0) {
      const occs = [];
      const base = new Date(debutIso);
      const baseFin = fin ? new Date(new Date(fin).toISOString()) : null;
      for (let i = 1; i <= Math.min(n, 51); i++) {
        const dd = new Date(base.getTime() + i * 7 * 24 * 3600 * 1000);
        const occ: { debut: string; fin?: string | null } = { debut: dd.toISOString() };
        if (baseFin) occ.fin = new Date(baseFin.getTime() + i * 7 * 24 * 3600 * 1000).toISOString();
        occs.push(occ);
      }
      payload.occurrences = occs;
    }
    setBusy(true);
    setError(null);
    try {
      if (estEdition && detail) {
        await modifierActivite(detail.id, payload, estSerie && toucherSerie ? "toute_la_serie" : undefined);
      } else {
        await creerActivite(payload);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && <p className="small" style={{ color: "var(--danger, #c0392b)" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ gridColumn: "1 / -1" }}>
          <span className="muted small">Titre *</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} />
        </label>
        <label>
          <span className="muted small">Fuseau horaire</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {FUSEAUX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          <span className="muted small">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="rassemblement">Rassemblement</option>
            <option value="formation">Formation</option>
            <option value="priere">Prière</option>
          </select>
        </label>
        <label>
          <span className="muted small">Début *</span>
          <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </label>
        <label>
          <span className="muted small">Fin</span>
          <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
        </label>
        <label>
          <span className="muted small">Lieu</span>
          <input value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </label>
        <label>
          <span className="muted small">Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="presentiel">Présentiel</option>
            <option value="en_ligne">En ligne</option>
            <option value="hybride">Hybride</option>
          </select>
        </label>
        <label>
          <span className="muted small">Diffusion</span>
          <select value={diffusion} onChange={(e) => setDiffusion(e.target.value)}>
            <option value="aucun">Aucune</option>
            <option value="embed">Diffusion intégrée (embed)</option>
            <option value="externe">Lien externe</option>
          </select>
        </label>
        <label>
          <span className="muted small">Visibilité</span>
          <select value={visibilite} onChange={(e) => setVisibilite(e.target.value)}>
            <option value="public">Public</option>
            <option value="membres">Membres</option>
            <option value="prive">Privé</option>
          </select>
        </label>
        <label>
          <span className="muted small">Volet</span>
          <select value={volet} onChange={(e) => setVolet(e.target.value)}>
            <option value="A">A (membres)</option>
            <option value="B">B (grand public)</option>
          </select>
        </label>
        <label>
          <span className="muted small">Fenêtre de réponse (h après la fin)</span>
          <input type="number" min={1} max={336} placeholder="Réglage global" value={fenetre} onChange={(e) => setFenetre(e.target.value)} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span className="muted small">Destinataires</span>
          <select value={cibleType} onChange={(e) => { setCibleType(e.target.value); setCibleId(null); }}>
            {Object.keys(CIBLE_LABELS).map((k) => <option key={k} value={k}>{CIBLE_LABELS[k]}</option>)}
          </select>
        </label>
        {CIBLE_UNITES.includes(cibleType) && (
          <label>
            <span className="muted small">Unité ciblée *</span>
            <select value={cibleId ?? ""} onChange={(e) => setCibleId(e.target.value || null)}>
              <option value="">Choisir...</option>
              {options.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
          </label>
        )}
        {cibleType === "liste" && (
          <label style={{ gridColumn: "1 / -1" }}>
            <span className="muted small">Adresses e-mail * (une par ligne)</span>
            <textarea value={emailsTexte} onChange={(e) => setEmailsTexte(e.target.value)} rows={2} />
          </label>
        )}
        <label>
          <span className="muted small">Affiner par genre</span>
          <select value={cibleGenre} onChange={(e) => setCibleGenre(e.target.value)}>
            <option value="">Tous</option>
            <option value="homme">Hommes</option>
            <option value="femme">Femmes</option>
          </select>
        </label>
        <label>
          <span className="muted small">Âge min.</span>
          <input type="number" min={0} max={120} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
        </label>
        <label>
          <span className="muted small">Âge max.</span>
          <input type="number" min={0} max={120} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
        </label>
        {!estEdition && (
          <label>
            <span className="muted small">Répéter chaque semaine (x fois)</span>
            <input type="number" min={0} max={51} value={repeter} onChange={(e) => setRepeter(e.target.value)} />
          </label>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="muted small">Liens de diffusion / accès</span>
          {liens.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input style={{ flex: 1 }} value={l} placeholder="https://..." onChange={(e) => setLiens(liens.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setLiens(liens.length > 1 ? liens.filter((_, j) => j !== i) : [""])}>−</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-inline" style={{ marginTop: 4 }} onClick={() => setLiens([...liens, ""])}>+ Ajouter un lien</button>
        </div>
      </div>

      {estSerie && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={toucherSerie} onChange={(e) => setToucherSerie(e.target.checked)} />
          Appliquer ces détails à toute la série (chaque date garde son horaire propre).
        </label>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-primary" disabled={busy || !titre.trim()} onClick={() => void save()}>
          {busy ? "Enregistrement..." : estEdition ? (toucherSerie ? "Enregistrer pour toute la série" : "Enregistrer") : "Créer l'activité"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}
