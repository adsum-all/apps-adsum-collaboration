import type { EspaceResume } from "../api.js";

export type Route =
  | { kind: "accueil" }
  | { kind: "mes-cartes" }
  | { kind: "calendrier" }
  | { kind: "notifications" }
  | { kind: "profil" }
  | { kind: "espace"; id: string }
  | { kind: "tableau"; id: string }
  | { kind: "comite" };

interface SidebarProps {
  espaces: EspaceResume[];
  route: Route;
  onNavigate: (r: Route) => void;
  currentInitials: string;
  currentNom: string;
  onQuitter: () => void;
  nbNotifsNonLues?: number;
  open: boolean;
  onClose: () => void;
}

interface Item {
  key: string;
  label: string;
  route: Route;
  badge?: number;
}

/** Left navigation, ported from the Lovable prototype: global entries, the user's
 * spaces, and the committee server view. Structure identical to the prototype; the
 * ESPACES section fills in once the space backend is live. */
export function Sidebar({
  espaces,
  route,
  onNavigate,
  currentInitials,
  currentNom,
  onQuitter,
  nbNotifsNonLues = 0,
  open,
  onClose,
}: SidebarProps): JSX.Element {
  const globaux: Item[] = [
    { key: "accueil", label: "Accueil", route: { kind: "accueil" } },
    { key: "mes-cartes", label: "Mes cartes", route: { kind: "mes-cartes" } },
    { key: "calendrier", label: "Calendrier", route: { kind: "calendrier" } },
    { key: "notifications", label: "Notifications", route: { kind: "notifications" }, badge: nbNotifsNonLues },
  ];

  const go = (r: Route): void => {
    onNavigate(r);
    onClose();
  };

  return (
    <>
      {open && <button type="button" className="sidebar-scrim" aria-label="Fermer le menu" onClick={onClose} />}
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <button
          type="button"
          className="brand brand-btn"
          onClick={() => go({ kind: "accueil" })}
          aria-label="Retour à l'accueil"
        >
          <span className="brand-logo" aria-hidden="true">A</span>
          <span className="brand-text">
            ADSUM
            <span className="brand-sub">SACERDOCE ROYAL</span>
          </span>
        </button>

        <nav aria-label="Navigation principale">
          {globaux.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`nav-item${sameRoute(it.route, route) ? " nav-item-active" : ""}`}
              onClick={() => go(it.route)}
            >
              <span>{it.label}</span>
              {it.badge && it.badge > 0 ? <span className="nav-badge">{it.badge}</span> : null}
            </button>
          ))}

          <div className="nav-group-title">Espaces</div>
          {espaces.length === 0 && <p className="nav-empty">Aucun espace</p>}
          {espaces.map((e) => {
            const active =
              (route.kind === "espace" && route.id === e.id);
            return (
              <button
                key={e.id}
                type="button"
                className={`nav-item${active ? " nav-item-active" : ""}`}
                onClick={() => go({ kind: "espace", id: e.id })}
              >
                <span className="nav-initiale" aria-hidden="true" style={{ background: e.couleur }}>
                  {e.initiale}
                </span>
                <span>{e.nom}</span>
              </button>
            );
          })}

          <div className="nav-group-title">Système</div>
          <button
            type="button"
            className={`nav-item${route.kind === "comite" || route.kind === "tableau" ? " nav-item-active" : ""}`}
            onClick={() => go({ kind: "comite" })}
          >
            <span>Tableaux du comité</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          <button
            type="button"
            className="avatar avatar-btn"
            onClick={() => go({ kind: "profil" })}
            aria-label="Mon profil"
          >
            {currentInitials}
          </button>
          <div className="sidebar-foot-txt">
            <button type="button" className="link link-strong" onClick={() => go({ kind: "profil" })}>
              {currentNom}
            </button>
            <button type="button" className="link" onClick={onQuitter}>Quitter</button>
          </div>
        </div>
      </aside>
    </>
  );
}

function sameRoute(a: Route, b: Route): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "espace" && b.kind === "espace") return a.id === b.id;
  return true;
}
