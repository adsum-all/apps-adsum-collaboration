import { useCallback, useEffect, useState } from "react";

import { type EspaceResume, type Session, getEspaces, setUnauthorizedHandler } from "./api.js";
import { Accueil } from "./components/Accueil.js";
import { Board } from "./components/Board.js";
import { BoardList } from "./components/BoardList.js";
import { Calendar } from "./components/Calendar.js";
import { Login } from "./components/Login.js";
import { type Route, Sidebar } from "./components/Sidebar.js";

/** Avatar initials from the signed-in user's e-mail (not their role), falling
 * back to the role for a legacy session persisted before the e-mail was kept. */
function avatarInitials(email: string, role: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  if (local) {
    const parts = local.split(/[.\-_+]/).filter(Boolean);
    const first = parts[0] ?? local;
    const second = parts[1];
    const letters = second ? first.slice(0, 1) + second.slice(0, 1) : first.slice(0, 2);
    return letters.toUpperCase();
  }
  return (role.slice(0, 2) || "?").toUpperCase();
}

function displayName(email: string, role: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  if (local) return local.replace(/[.\-_+]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return role || "Comité";
}

// Persisted session: a refresh no longer signs the committee member out.
const SESSION_KEY = "adsum.collab.session";
function loadSession(): Session | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode: keep the session in memory only. */
  }
}

const TITRES: Record<Route["kind"], string> = {
  accueil: "Accueil",
  "mes-cartes": "Mes cartes",
  calendrier: "Calendrier",
  notifications: "Notifications",
  profil: "Mon profil",
  espace: "Espace",
  tableau: "Tableau",
  comite: "Tableaux du comité",
};

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [route, setRoute] = useState<Route>({ kind: "accueil" });
  const [espaces, setEspaces] = useState<EspaceResume[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const onAuth = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
    setRoute({ kind: "accueil" });
  }, []);
  const quitter = useCallback(() => {
    saveSession(null);
    setSession(null);
    setEspaces([]);
  }, []);

  // Any 401 from the API purges the session and returns to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(quitter);
    return () => setUnauthorizedHandler(null);
  }, [quitter]);

  useEffect(() => {
    if (!session) return;
    void getEspaces(session.token).then(setEspaces).catch(() => setEspaces([]));
  }, [session]);

  if (!session) {
    return <Login onAuth={onAuth} />;
  }

  const email = session.email ?? "";
  const initials = avatarInitials(email, session.role);
  const nom = displayName(email, session.role);

  return (
    <div className="shell">
      <Sidebar
        espaces={espaces}
        route={route}
        onNavigate={setRoute}
        currentInitials={initials}
        currentNom={nom}
        onQuitter={quitter}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="shell-main">
        <header className="shell-topbar">
          <button type="button" className="hamburger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <span />
            <span />
            <span />
          </button>
          <span className="shell-crumb">{TITRES[route.kind]}</span>
          <span className="event-chip" title="Accès restreint">
            <span className="event-dot" aria-hidden="true" />
            Comité, accès restreint
          </span>
        </header>
        <div className="shell-scroll">{renderRoute(route, session, nom, espaces, setRoute)}</div>
      </div>
    </div>
  );
}

function renderRoute(
  route: Route,
  session: Session,
  nom: string,
  espaces: EspaceResume[],
  navigate: (r: Route) => void,
): JSX.Element {
  switch (route.kind) {
    case "accueil":
      return <Accueil token={session.token} nom={nom} espaces={espaces} onNavigate={navigate} />;
    case "calendrier":
      return <Calendar token={session.token} onOpenBoard={(id) => navigate({ kind: "tableau", id })} />;
    case "tableau":
      return <Board token={session.token} boardId={route.id} />;
    case "comite":
      return <BoardList token={session.token} onOpen={(id) => navigate({ kind: "tableau", id })} />;
    default:
      return <Bientot />;
  }
}

/** Honest placeholder for sections whose backend (spaces, assignments,
 * notifications) is being built. No seeded or fake content. */
function Bientot(): JSX.Element {
  return (
    <section className="vide-section">
      <h2>Section en cours d&apos;activation</h2>
      <p className="muted">
        Cette partie (espaces de collaboration, cartes assignées, notifications) s&apos;active avec son service
        backend. Les tableaux et le calendrier sont déjà opérationnels.
      </p>
    </section>
  );
}
