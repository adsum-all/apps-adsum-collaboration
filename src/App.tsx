import { useCallback, useEffect, useState } from "react";

import { type Session, setUnauthorizedHandler } from "./api.js";
import { Board } from "./components/Board.js";
import { BoardList } from "./components/BoardList.js";
import { Login } from "./components/Login.js";

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

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [boardId, setBoardId] = useState<string | null>(null);

  const onAuth = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);
  const quitter = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  // Any 401 from the API purges the session and returns to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(quitter);
    return () => setUnauthorizedHandler(null);
  }, [quitter]);

  if (!session) {
    return <Login onAuth={onAuth} />;
  }

  const initials = avatarInitials(session.email ?? "", session.role);

  return (
    <div className="main">
      <header className="topbar-app">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            A
          </span>
          <span className="brand-text">
            ADSUM
            <span className="brand-sub">Collaboration</span>
          </span>
        </div>
        {boardId && (
          <button type="button" className="link" onClick={() => setBoardId(null)}>
            Tous les tableaux
          </button>
        )}
        <span className="event-chip" title="Accès restreint">
          <span className="event-dot" aria-hidden="true" />
          Comité, accès restreint
        </span>
        <span className="topbar-avatar" title={session.email || session.role}>
          {initials}
        </span>
        <button type="button" className="link" onClick={quitter}>
          Quitter
        </button>
      </header>
      <div className="main-scroll">
        {boardId ? (
          <Board token={session.token} boardId={boardId} />
        ) : (
          <BoardList token={session.token} onOpen={setBoardId} />
        )}
      </div>
    </div>
  );
}
