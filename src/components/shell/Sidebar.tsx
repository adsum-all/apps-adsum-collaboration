import type { Espace } from "../../lib/types.js";

export type Route =
  | { kind: "accueil" }
  | { kind: "mes-cartes" }
  | { kind: "calendrier" }
  | { kind: "notifications" }
  | { kind: "profil" }
  | { kind: "espace"; id: string }
  | { kind: "tableau"; espaceId: string; id: string; carteId?: string }
  | { kind: "comite" };

interface SidebarProps {
  espaces: Espace[];
  route: Route;
  onNavigate: (r: Route) => void;
  currentInitials: string;
  currentNom: string;
  onQuitter: () => void;
  nbNotifsNonLues?: number;
}

interface Item {
  key: string;
  label: string;
  route: Route;
  badge?: number;
}

export function Sidebar({ espaces, route, onNavigate, currentInitials, currentNom, onQuitter, nbNotifsNonLues = 0 }: SidebarProps): JSX.Element {
  const globaux: Item[] = [
    { key: "accueil", label: "Accueil", route: { kind: "accueil" } },
    { key: "mes-cartes", label: "Mes cartes", route: { kind: "mes-cartes" } },
    { key: "calendrier", label: "Calendrier", route: { kind: "calendrier" } },
    { key: "notifications", label: "Notifications", route: { kind: "notifications" }, badge: nbNotifsNonLues },
  ];
  return (
    <aside className="sidebar">
      <button type="button" className="brand brand-btn" onClick={() => onNavigate({ kind: "accueil" })} aria-label="Retour à l'accueil">
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
            onClick={() => onNavigate(it.route)}
          >
            <span>{it.label}</span>
            {it.badge && it.badge > 0 ? <span className="nav-badge">{it.badge}</span> : null}
          </button>
        ))}


        <div className="nav-group-title">ESPACES</div>
        {espaces.length === 0 && <p className="nav-empty">Aucun espace</p>}
        {espaces.map((e) => {
          const active =
            (route.kind === "espace" && route.id === e.id) ||
            (route.kind === "tableau" && route.espaceId === e.id);
          return (
            <button
              key={e.id}
              type="button"
              className={`nav-item${active ? " nav-item-active" : ""}`}
              onClick={() => onNavigate({ kind: "espace", id: e.id })}
            >
              <span className="nav-initiale" aria-hidden="true" style={{ background: e.couleur }}>
                {e.initiale}
              </span>
              <span>{e.nom}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="nav-item nav-item-add"
          onClick={() => onNavigate({ kind: "accueil" })}
          aria-label="Créer un espace"
        >
          <span className="nav-initiale nav-initiale-add" aria-hidden="true">+</span>
          <span>Créer un espace</span>
        </button>

        <div className="nav-group-title">SYSTÈME</div>
        <button
          type="button"
          className={`nav-item${route.kind === "comite" ? " nav-item-active" : ""}`}
          onClick={() => onNavigate({ kind: "comite" })}
        >
          <span>Comité (serveur)</span>
        </button>
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="avatar avatar-btn" onClick={() => onNavigate({ kind: "profil" })} aria-label="Mon profil">{currentInitials}</button>
        <div className="sidebar-foot-txt">
          <button type="button" className="link link-strong" onClick={() => onNavigate({ kind: "profil" })}>{currentNom}</button>
          <button type="button" className="link" onClick={onQuitter}>Quitter</button>
        </div>
      </div>

    </aside>
  );
}

function sameRoute(a: Route, b: Route): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "espace" && b.kind === "espace") return a.id === b.id;
  if (a.kind === "tableau" && b.kind === "tableau") return a.id === b.id;
  return true;
}
