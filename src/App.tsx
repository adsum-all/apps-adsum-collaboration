import { useCallback, useState } from "react";

import { type Session } from "./api.js";
import { Board } from "./components/Board.js";
import { BoardList } from "./components/BoardList.js";
import { Login } from "./components/Login.js";

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);

  const onAuth = useCallback((s: Session) => setSession(s), []);

  if (!session) {
    return <Login onAuth={onAuth} />;
  }

  const initials = session.role.slice(0, 2).toUpperCase();

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
        <span className="event-chip" title="Acces restreint">
          <span className="event-dot" aria-hidden="true" />
          Comite, acces restreint
        </span>
        <span className="topbar-avatar" title={session.role}>
          {initials}
        </span>
        <button type="button" className="link" onClick={() => setSession(null)}>
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
