import { useEffect, useState } from "react";

import { currentMembre, listEspaces, listMesCartes, mettreAJourMembreCourant } from "../../lib/store.js";
import { libelleRole, roleDansEspace } from "../../lib/permissions.js";
import type { Espace, Membre } from "../../lib/types.js";

interface Props {
  onEnregistre: () => void;
}

function membreSur(): Membre {
  try {
    return currentMembre();
  } catch {
    return { id: "", nom: "Membre", courriel: "", initiales: "AD" };
  }
}

export function ProfilPage({ onEnregistre }: Props): JSX.Element {
  const [me, setMe] = useState<Membre>(membreSur);
  const [nom, setNom] = useState(me.nom);
  const [courriel, setCourriel] = useState(me.courriel);
  const [initiales, setInitiales] = useState(me.initiales);
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [nbCartes, setNbCartes] = useState(0);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // Refresh the member from the server so the form is never based on a stale or
    // empty cache (the resolved identity comes back on the profile endpoint).
    void mettreAJourMembreCourant({}).then((m) => {
      setMe(m);
      setNom(m.nom);
      setCourriel(m.courriel);
      setInitiales(m.initiales);
    });
    void listEspaces().then(setEspaces);
    void listMesCartes().then((c) => setNbCartes(c.length));
  }, []);

  async function save(): Promise<void> {
    const next = await mettreAJourMembreCourant({ nom, courriel, initiales });
    setMe(next);
    setInitiales(next.initiales);
    setOk(true);
    onEnregistre();
    setTimeout(() => setOk(false), 2500);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Mon profil</h1>
        <p className="muted">Vos informations et votre appartenance aux espaces.</p>
      </header>

      <div className="profil-carte">
        <div className="profil-avatar" aria-hidden="true">{initiales}</div>
        <div className="profil-form">
          <label>
            <span>Nom affiché</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} />
          </label>
          <label>
            <span>Courriel</span>
            <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} />
          </label>
          <label>
            <span>Initiales</span>
            <input value={initiales} onChange={(e) => setInitiales(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} />
          </label>
          <div className="row-end">
            {ok && <span className="badge badge-ok">Enregistré</span>}
            <button type="button" className="btn btn-primary" onClick={save} disabled={!nom.trim()}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <section className="section">
        <h2>Mes espaces ({espaces.length})</h2>
        <ul className="profil-espaces">
          {espaces.map((e) => {
            const role = roleDansEspace(e, me.id);
            return (
              <li key={e.id}>
                <span className="nav-initiale" aria-hidden="true" style={{ background: e.couleur }}>{e.initiale}</span>
                <div>
                  <strong>{e.nom}</strong>
                  <span className="muted small"> · {role ? libelleRole(role) : "-"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section">
        <h2>Résumé</h2>
        <div className="stat-grid">
          <div className="stat-tile"><span className="stat-val">{espaces.length}</span><span className="muted small">Espaces</span></div>
          <div className="stat-tile"><span className="stat-val">{nbCartes}</span><span className="muted small">Cartes suivies</span></div>
        </div>
      </section>
    </div>
  );
}
