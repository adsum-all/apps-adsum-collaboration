import { useEffect, useMemo, useRef, useState } from "react";

import {
  ajouterChecklist,
  ajouterChecklistItem,
  ajouterCommentaire,
  convertirItemEnCarte,
  deleteCarteProto,
  deplacerCarteVersTableau,
  duplicateCarte,
  listTableauxEspace,
  modifierChecklistItem,
  modifierCommentaire,
  publierCarteEnActivite,
  marquerCommentairesLus,
  reagirCommentaire,
  supprimerChecklist,
  supprimerChecklistItem,
  supprimerCommentaire,
  toggleArchiveCarte,
  toggleChecklistItem,
  updateCarteProto,
} from "../../lib/store.js";
import { peut, roleDansEspace } from "../../lib/permissions.js";
import type { CarteProto, Espace, Membre, Priorite, TableauProto } from "../../lib/types.js";
import { PiecesCarte } from "./PiecesCarte.js";

interface Props {
  carte: CarteProto;
  espace: Espace;
  membres: Membre[];
  moiId: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

const PRIOS: Priorite[] = ["urgente", "haute", "normale", "basse"];

export function CarteModalProto({ carte, espace, membres, moiId, onClose, onChanged }: Props): JSX.Element {
  const [titre, setTitre] = useState(carte.titre);
  const [description, setDescription] = useState(carte.description);
  const [echeance, setEcheance] = useState(carte.echeance ? carte.echeance.slice(0, 10) : "");
  const [priorite, setPriorite] = useState<Priorite>(carte.priorite);
  const [nouveauCom, setNouveauCom] = useState("");
  const [nouvelleChecklist, setNouvelleChecklist] = useState("");
  const [nouveauItem, setNouveauItem] = useState<Record<string, string>>({});
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFrag, setMentionFrag] = useState("");
  const [tableauxCible, setTableauxCible] = useState<TableauProto[]>([]);
  const [showMove, setShowMove] = useState(false);
  const [showPublier, setShowPublier] = useState(false);
  const [publierDate, setPublierDate] = useState(carte.echeance ? carte.echeance.slice(0, 10) : (carte.debut ? carte.debut.slice(0, 10) : ""));
  const [publierType, setPublierType] = useState<"rassemblement" | "formation" | "priere">("rassemblement");
  const [publierErr, setPublierErr] = useState<string | null>(null);
  const [publieOk, setPublieOk] = useState(Boolean(carte.publie));
  const inputComRef = useRef<HTMLInputElement | null>(null);
  const [editCom, setEditCom] = useState<{ id: string; corps: string } | null>(null);

  const role = roleDansEspace(espace, moiId);
  const peutEditer = peut(espace, role, "editer_carte");
  const peutCommenter = peut(espace, role, "commenter");
  const peutArchiver = peut(espace, role, "archiver");
  const peutPublier = peut(espace, role, "publier_evenement");
  const membresEspace = membres.filter((m) => espace.membres.some((em) => em.membre_id === m.id));

  useEffect(() => {
    void marquerCommentairesLus(carte.id).then(() => onChanged());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carte.id]);

  useEffect(() => {
    void listTableauxEspace(espace.id).then(setTableauxCible);
  }, [espace.id]);

  // Mention suggestions from the real space members (the members passed in that
  // belong to this space), filtered by the typed fragment. No stub.
  const suggestions = useMemo(() => {
    if (!mentionOpen) return [];
    const frag = mentionFrag.trim().toLowerCase();
    const membresEspace = membres.filter((m) => espace.membres.some((em) => em.membre_id === m.id));
    if (!frag) return membresEspace.slice(0, 6);
    return membresEspace
      .filter((m) => m.nom.toLowerCase().includes(frag) || m.courriel.toLowerCase().includes(frag))
      .slice(0, 6);
  }, [mentionOpen, mentionFrag, membres, espace.membres]);

  async function save(patch: Partial<CarteProto>): Promise<void> {
    await updateCarteProto(carte.id, patch);
    await onChanged();
  }

  function toggleEtiquette(id: string): void {
    const has = carte.etiquettes.includes(id);
    void save({ etiquettes: has ? carte.etiquettes.filter((x) => x !== id) : [...carte.etiquettes, id] });
  }

  function toggleAssigne(id: string): void {
    const has = carte.assignes.includes(id);
    void save({ assignes: has ? carte.assignes.filter((x) => x !== id) : [...carte.assignes, id] });
  }

  function nomMembre(id: string): string {
    return membres.find((m) => m.id === id)?.nom ?? id;
  }

  function onComChange(v: string): void {
    setNouveauCom(v);
    const m = v.match(/@([\p{L}\p{M}'-]*)$/u);
    if (m) {
      setMentionOpen(true);
      setMentionFrag(m[1] ?? "");
    } else {
      setMentionOpen(false);
    }
  }

  function insererMention(nom: string): void {
    const v = nouveauCom.replace(/@([\p{L}\p{M}'-]*)$/u, `@${nom} `);
    setNouveauCom(v);
    setMentionOpen(false);
    inputComRef.current?.focus();
  }

  async function envoyerCom(): Promise<void> {
    const v = nouveauCom.trim();
    if (!v) return;
    await ajouterCommentaire(carte.id, v);
    setNouveauCom("");
    setMentionOpen(false);
    await onChanged();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <span className="muted small">Carte #{carte.numero}{carte.archive && " · Archivée"}</span>
            {peutEditer ? (
              <input
                className="modal-titre-input"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onBlur={() => titre !== carte.titre && void save({ titre })}
                aria-label="Titre de la carte"
              />
            ) : (
              <h2>{titre}</h2>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-inline" onClick={onClose} aria-label="Fermer">Fermer</button>
        </div>

        <div className="modal-body">
          <div className="modal-form">
            <label>
              <span>Description</span>
              <textarea
                className="textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== carte.description && void save({ description })}
                disabled={!peutEditer}
                placeholder="Contexte, décisions, liens..."
              />
            </label>

            <div className="modal-grid">
              <label>
                <span>Priorité</span>
                <select value={priorite} disabled={!peutEditer} onChange={(e) => { const p = e.target.value as Priorite; setPriorite(p); void save({ priorite: p }); }}>
                  {PRIOS.map((p) => (<option key={p} value={p}>{libPrio(p)}</option>))}
                </select>
              </label>
              <label>
                <span>Échéance</span>
                <input
                  type="date"
                  value={echeance}
                  disabled={!peutEditer}
                  onChange={(e) => setEcheance(e.target.value)}
                  onBlur={() => {
                    const iso = echeance ? new Date(echeance).toISOString() : null;
                    if (iso !== carte.echeance) void save({ echeance: iso });
                  }}
                />
              </label>
            </div>

            <div>
              <span className="modal-section-titre">Étiquettes</span>
              <div className="et-picker">
                {espace.etiquettes.map((et) => {
                  const active = carte.etiquettes.includes(et.id);
                  return (
                    <button key={et.id} type="button"
                      className={`et-pill${active ? "" : " et-pill-off"}`}
                      style={active ? { background: et.couleur } : { borderColor: et.couleur, color: et.couleur }}
                      onClick={() => peutEditer && toggleEtiquette(et.id)}
                      disabled={!peutEditer}
                    >{et.nom}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="modal-section-titre">Assignés</span>
              <div className="et-picker">
                {membres.filter((m) => espace.membres.some((em) => em.membre_id === m.id)).map((m) => {
                  const active = carte.assignes.includes(m.id);
                  return (
                    <button key={m.id} type="button" className={`membre-chip${active ? " membre-chip-on" : ""}`}
                      onClick={() => peutEditer && toggleAssigne(m.id)} disabled={!peutEditer}>
                      <span className="avatar avatar-sm" aria-hidden="true">{m.initiales}</span>
                      <span>{m.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="modal-section-titre">Checklists</span>
              {carte.checklists.map((cl) => {
                const total = cl.items.length;
                const faits = cl.items.filter((i) => i.fait).length;
                const pct = total > 0 ? Math.round((faits / total) * 100) : 0;
                return (
                  <div key={cl.id} className="checklist">
                    <div className="checklist-head">
                      <strong>{cl.titre}</strong>
                      <span className="muted small">{faits}/{total} · {pct}%</span>
                      {peutEditer && (
                        <button type="button" className="btn btn-ghost btn-inline" style={{ fontSize: 11 }}
                          onClick={async () => { if (window.confirm(`Supprimer la checklist « ${cl.titre} » ?`)) { await supprimerChecklist(cl.id); await onChanged(); } }}>
                          Supprimer la checklist
                        </button>
                      )}
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                    <ul>
                      {cl.items.map((it) => (
                        <li key={it.id}>
                          <label className="switch-row">
                            <input type="checkbox" checked={it.fait} disabled={!peutEditer}
                              onChange={async () => { await toggleChecklistItem(carte.id, cl.id, it.id); await onChanged(); }} />
                            <span className={it.fait ? "checklist-fait" : ""}>{it.texte}</span>
                          </label>
                          {peutEditer && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "2px 0 6px 26px" }}>
                              <select aria-label="Assigné" value={it.assigne_id ?? ""} style={{ fontSize: 12 }}
                                onChange={async (e) => { await modifierChecklistItem(it.id, { assigne_id: e.target.value || null }); await onChanged(); }}>
                                <option value="">Non assigné</option>
                                {membresEspace.map((m) => (<option key={m.id} value={m.id}>{m.nom}</option>))}
                              </select>
                              <input type="date" aria-label="Échéance item" style={{ fontSize: 12 }}
                                value={it.echeance ? it.echeance.slice(0, 10) : ""}
                                onChange={async (e) => { await modifierChecklistItem(it.id, { echeance: e.target.value ? new Date(e.target.value).toISOString() : null }); await onChanged(); }} />
                              <button type="button" className="btn btn-ghost btn-inline" style={{ fontSize: 11 }}
                                onClick={async () => { await convertirItemEnCarte(it.id); await onChanged(); }} title="Convertir en carte">
                                Convertir en carte
                              </button>
                              <button type="button" className="btn btn-ghost btn-inline" style={{ fontSize: 11 }}
                                onClick={async () => { await supprimerChecklistItem(it.id); await onChanged(); }}>
                                Supprimer
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {peutEditer && (
                      <div className="kanban-add">
                        <input value={nouveauItem[cl.id] ?? ""} placeholder="+ Ajouter un item"
                          onChange={(e) => setNouveauItem({ ...nouveauItem, [cl.id]: e.target.value })}
                          onKeyDown={async (e) => {
                            const v = (nouveauItem[cl.id] ?? "").trim();
                            if (e.key === "Enter" && v) {
                              await ajouterChecklistItem(carte.id, cl.id, v);
                              setNouveauItem({ ...nouveauItem, [cl.id]: "" });
                              await onChanged();
                            }
                          }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {peutEditer && (
                <div className="kanban-add" style={{ marginTop: 8 }}>
                  <input value={nouvelleChecklist} placeholder="+ Nouvelle checklist"
                    onChange={(e) => setNouvelleChecklist(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && nouvelleChecklist.trim()) {
                        await ajouterChecklist(carte.id, nouvelleChecklist.trim());
                        setNouvelleChecklist("");
                        await onChanged();
                      }
                    }} />
                </div>
              )}
            </div>

            <PiecesCarte carte={carte} peutEditer={peutEditer} onChanged={onChanged} />

            {(peutEditer || peutArchiver || peutPublier) && (
              <div className="modal-actions" style={{ flexWrap: "wrap" }}>
                {peutEditer && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={async () => {
                    await duplicateCarte(carte.id); await onChanged();
                  }}>Dupliquer</button>
                )}
                {peutEditer && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => setShowMove((v) => !v)}>
                    Déplacer vers un tableau…
                  </button>
                )}
                {publieOk ? (
                  <span className="chip chip-ok" title="Cette carte a été publiée en activité">Publiée en activité</span>
                ) : peutPublier && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => { setShowPublier((v) => !v); setPublierErr(null); }}>
                    Publier en activité…
                  </button>
                )}
                {peutArchiver && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={async () => {
                    await toggleArchiveCarte(carte.id, !carte.archive);
                    await onChanged();
                  }}>{carte.archive ? "Restaurer" : "Archiver"}</button>
                )}
                {peutArchiver && (
                  <button type="button" className="btn btn-danger" onClick={async () => {
                    if (window.confirm("Supprimer définitivement cette carte ?")) {
                      await deleteCarteProto(carte.id);
                      await onChanged();
                      onClose();
                    }
                  }}>Supprimer</button>
                )}
                {showMove && (
                  <select onChange={async (e) => {
                    const id = e.target.value;
                    if (id && id !== carte.tableau_id) {
                      await deplacerCarteVersTableau(carte.id, id);
                      await onChanged();
                      onClose();
                    }
                  }} defaultValue="">
                    <option value="">- Choisir un tableau -</option>
                    {tableauxCible.filter((t) => t.id !== carte.tableau_id).map((t) => (
                      <option key={t.id} value={t.id}>{t.nom}</option>
                    ))}
                  </select>
                )}
                {showPublier && !publieOk && (
                  <div className="publier-panneau" style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span className="small muted">Publier « {carte.titre} » comme activité pour tous les membres :</span>
                    <label className="small muted">Type</label>
                    <select value={publierType} onChange={(e) => setPublierType(e.target.value as typeof publierType)}>
                      <option value="rassemblement">Rassemblement</option>
                      <option value="formation">Formation</option>
                      <option value="priere">Prière</option>
                    </select>
                    <label className="small muted">Date</label>
                    <input type="date" value={publierDate} onChange={(e) => setPublierDate(e.target.value)} />
                    <button type="button" className="btn btn-primary btn-inline" disabled={!publierDate} onClick={async () => {
                      setPublierErr(null);
                      try {
                        await publierCarteEnActivite(carte.id, {
                          cible_type: "general",
                          type: publierType,
                          debut: new Date(publierDate).toISOString(),
                        });
                        setPublieOk(true);
                        setShowPublier(false);
                        await onChanged();
                      } catch (err) {
                        setPublierErr(err instanceof Error ? err.message : "Publication impossible");
                      }
                    }}>Publier</button>
                    <span className="small muted" style={{ width: "100%" }}>
                      L'activité est ajoutée à l'agenda des membres et les membres de l'espace sont notifiés. Le ciblage par unité (coordination, commission, tribu) se choisit dans le back office.
                    </span>
                    {publierErr && <span className="small" style={{ color: "var(--danger, #c0392b)", width: "100%" }}>{publierErr}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-chat">
            <div className="chat-thread">
              {carte.commentaires.length === 0 && (<p className="muted small">Aucun commentaire pour l'instant.</p>)}
              {carte.commentaires.map((c) => {
                const pouces = c.reactions.filter((r) => r.type === "pouce").length;
                const coches = c.reactions.filter((r) => r.type === "coche").length;
                const jePouce = c.reactions.some((r) => r.type === "pouce" && r.membre_id === moiId);
                const jeCoche = c.reactions.some((r) => r.type === "coche" && r.membre_id === moiId);
                const estAuteur = c.auteur_id === moiId;
                return (
                  <div key={c.id} className="chat-msg">
                    <span className="chat-author">{nomMembre(c.auteur_id)}</span>
                    {editCom?.id === c.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "4px 0" }}>
                        <textarea className="textarea" rows={2} value={editCom.corps}
                          onChange={(e) => setEditCom({ id: c.id, corps: e.target.value })} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn btn-primary btn-inline" disabled={!editCom.corps.trim()}
                            onClick={async () => { await modifierCommentaire(c.id, editCom.corps.trim()); setEditCom(null); await onChanged(); }}>Enregistrer</button>
                          <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEditCom(null)}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <span className="chat-body">{c.corps}{c.edite_le && <span className="muted small"> (modifié)</span>}</span>
                    )}
                    <span className="chat-time">{new Date(c.cree_le).toLocaleString("fr-FR")}</span>
                    {peutCommenter && editCom?.id !== c.id && (
                      <span className="chat-reactions">
                        <button type="button" className={`react-btn${jePouce ? " react-btn-on" : ""}`}
                          onClick={async () => { await reagirCommentaire(carte.id, c.id, "pouce"); await onChanged(); }}>
                          J&apos;aime{pouces > 0 ? ` ${pouces}` : ""}
                        </button>
                        <button type="button" className={`react-btn${jeCoche ? " react-btn-on" : ""}`}
                          onClick={async () => { await reagirCommentaire(carte.id, c.id, "coche"); await onChanged(); }}>
                          Fait{coches > 0 ? ` ${coches}` : ""}
                        </button>
                        {estAuteur && (
                          <>
                            <button type="button" className="react-btn" onClick={() => setEditCom({ id: c.id, corps: c.corps })}>Modifier</button>
                            <button type="button" className="react-btn"
                              onClick={async () => { if (window.confirm("Supprimer ce commentaire ?")) { await supprimerCommentaire(c.id); await onChanged(); } }}>Supprimer</button>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              {carte.activite.map((a) => (
                <div key={a.id} className="chat-activity">
                  <span className="muted small">
                    {nomMembre(a.auteur_id)} {a.texte} · {new Date(a.cree_le).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
            {peutCommenter && (
              <div className="chat-input" style={{ position: "relative" }}>
                <input ref={inputComRef} value={nouveauCom} placeholder="Écrire un commentaire (@ pour mentionner)…"
                  onChange={(e) => onComChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !mentionOpen) void envoyerCom(); }} />
                <button type="button" className="btn btn-primary btn-inline" disabled={!nouveauCom.trim()} onClick={() => void envoyerCom()}>
                  Envoyer
                </button>
                {mentionOpen && suggestions.length > 0 && (
                  <div className="mention-pop">
                    {suggestions.map((m) => (
                      <button key={m.id} type="button" className="mention-item" onClick={() => insererMention(m.nom.split(" ")[0]!)}>
                        <span className="avatar avatar-sm">{m.initiales}</span>
                        <span>{m.nom}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function libPrio(p: Priorite): string {
  switch (p) {
    case "urgente": return "Urgente";
    case "haute": return "Haute";
    case "normale": return "Normale";
    case "basse": return "Basse";
  }
}
