import { useState } from "react";

import {
  createEtiquette,
  deleteEtiquette,
  updateEspace,
  updateEtiquette,
} from "../../lib/store.js";
import { libelleRole, peut } from "../../lib/permissions.js";
import type { Espace, RoleEspace } from "../../lib/types.js";
import { PermissionsMatrix } from "./PermissionsMatrix.js";
import { ArchivesPanel } from "./ArchivesPanel.js";

interface Props {
  espace: Espace;
  roleReel: RoleEspace | null;
  viewAs: RoleEspace | null;
  onViewAs: (r: RoleEspace | null) => void;
  onChanged: () => void;
}

export function TabReglages({ espace, roleReel, viewAs, onViewAs, onChanged }: Props): JSX.Element {
  const [nom, setNom] = useState(espace.nom);
  const [description, setDescription] = useState(espace.description);
  const [newEt, setNewEt] = useState("");
  const [newEtCouleur, setNewEtCouleur] = useState("#2a4fad");
  const roleEffectif: RoleEspace | null = viewAs ?? roleReel;
  const peutGererEt = peut(espace, roleEffectif, "gerer_etiquettes");
  const estProprio = roleReel === "proprietaire";

  return (
    <div>
      <section className="card">
        <h2 className="card-title">Général</h2>
        <div className="form-grid">
          <label>
            <span>Nom de l'espace</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} disabled={!peut(espace, roleEffectif, "gerer_membres")} />
          </label>
          <label>
            <span>Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!peut(espace, roleEffectif, "gerer_membres")} />
          </label>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!peut(espace, roleEffectif, "gerer_membres")}
            onClick={() => void updateEspace(espace.id, { nom, description }).then(onChanged)}
          >
            Enregistrer
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Commentaires des observateurs</h2>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={espace.observateurs_commentent}
            disabled={!peut(espace, roleEffectif, "gerer_membres")}
            onChange={(e) => void updateEspace(espace.id, { observateurs_commentent: e.target.checked }).then(onChanged)}
          />
          <span>Autoriser les observateurs à commenter les cartes</span>
        </label>
      </section>

      <section className="card">
        <h2 className="card-title">Étiquettes par défaut de l'espace</h2>
        <ul className="mini-list">
          {espace.etiquettes.map((et) => (
            <li key={et.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="et-swatch" style={{ background: et.couleur }} aria-hidden="true" />
                {peutGererEt ? (
                  <input
                    className="inline-input"
                    value={et.nom}
                    onChange={(e) => void updateEtiquette(espace.id, et.id, { nom: e.target.value }).then(onChanged)}
                  />
                ) : (
                  <span>{et.nom}</span>
                )}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {peutGererEt && (
                  <input
                    type="color"
                    value={et.couleur}
                    onChange={(e) => void updateEtiquette(espace.id, et.id, { couleur: e.target.value }).then(onChanged)}
                    aria-label="Couleur de l'étiquette"
                  />
                )}
                <label className="switch-row" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={et.par_defaut}
                    disabled={!peutGererEt}
                    onChange={(e) => void updateEtiquette(espace.id, et.id, { par_defaut: e.target.checked }).then(onChanged)}
                  />
                  <span className="small">Proposée à la création</span>
                </label>
                {peutGererEt && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => {
                      if (window.confirm(`Supprimer l'étiquette « ${et.nom} » ?`)) {
                        void deleteEtiquette(espace.id, et.id).then(onChanged);
                      }
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {peutGererEt && (
          <div className="toolbar" style={{ marginTop: 12 }}>
            <input
              className="search"
              value={newEt}
              placeholder="Nom de la nouvelle étiquette"
              onChange={(e) => setNewEt(e.target.value)}
            />
            <input
              type="color"
              value={newEtCouleur}
              onChange={(e) => setNewEtCouleur(e.target.value)}
              aria-label="Couleur"
            />
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={!newEt.trim()}
              onClick={() => {
                void createEtiquette(espace.id, {
                  nom: newEt.trim(),
                  couleur: newEtCouleur,
                  par_defaut: false,
                }).then(() => {
                  setNewEt("");
                  onChanged();
                });
              }}
            >
              Créer
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Matrice de droits (lecture seule)</h2>
        <p className="muted small">Les rôles par défaut ne sont pas modifiables dans cette itération.</p>
        <PermissionsMatrix />
      </section>

      <section className="card">
        <h2 className="card-title">Voir en tant que</h2>
        <p className="muted small">
          Simule un rôle pour démontrer les autorisations. Votre rôle réel : {roleReel ? libelleRole(roleReel) : "aucun"}.
        </p>
        <div className="toolbar">
          {(["proprietaire", "admin", "membre", "observateur"] as RoleEspace[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-ghost btn-inline${viewAs === r ? " btn-active" : ""}`}
              onClick={() => onViewAs(viewAs === r ? null : r)}
            >
              {libelleRole(r)}
            </button>
          ))}
          {viewAs && (
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => onViewAs(null)}>
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Tableaux archivés</h2>
        <ArchivesPanel espace={espace} onChanged={onChanged} />
      </section>

      {estProprio && (
        <section className="card">
          <h2 className="card-title">Archivage de l'espace</h2>
          <p className="muted small">Réservé au propriétaire. L'espace n'apparaîtra plus dans la barre latérale.</p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm("Archiver définitivement cet espace ?")) {
                void updateEspace(espace.id, { archive: true }).then(onChanged);
              }
            }}
          >
            Archiver l'espace
          </button>
        </section>
      )}
    </div>
  );
}
