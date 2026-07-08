import { useEffect, useState } from "react";

import { type Session } from "./api.js";
import { Board } from "./components/Board.js";
import { BoardList } from "./components/BoardList.js";
import { Login } from "./components/Login.js";
import { EspacePage } from "./components/espace/EspacePage.js";
import { EmptyState } from "./components/common/EmptyState.js";
import { RaccourcisModal } from "./components/common/RaccourcisModal.js";
import { CalendrierPage } from "./components/calendrier/CalendrierPage.js";
import { NotificationsPage } from "./components/notifications/NotificationsPage.js";
import { ProfilPage } from "./components/profil/ProfilPage.js";
import { Home } from "./components/home/Home.js";
import { MesCartes } from "./components/mes-cartes/MesCartes.js";
import { GlobalSearch } from "./components/search/GlobalSearch.js";
import { Sidebar, type Route } from "./components/shell/Sidebar.js";
import { Topbar } from "./components/shell/Topbar.js";
import { TableauPage } from "./components/tableau/TableauPage.js";
import { initStore, listEspaces, listNotifications, resetStore } from "./lib/store.js";
import type { Espace, Membre } from "./lib/types.js";
import { clearSession, loadSession, saveSession } from "./session.js";

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [route, setRoute] = useState<Route>({ kind: "accueil" });
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [nbNotifs, setNbNotifs] = useState(0);
  const [tick, setTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [me, setMe] = useState<Membre | null>(null);

  const reloadEspaces = (): void => {
    void listEspaces().then(setEspaces);
    void listNotifications().then((n) => setNbNotifs(n.filter((x) => !x.lue).length));
  };

  // Resolve the session once (token + current member), not on every render, then
  // load the spaces. Avoids re-firing /auth/me on each 5 s tick.
  useEffect(() => {
    if (!session) {
      setMe(null);
      return;
    }
    let alive = true;
    void initStore(session).then((m) => {
      if (!alive) return;
      setMe(m);
      reloadEspaces();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void listNotifications().then((n) => setNbNotifs(n.filter((x) => !x.lue).length));
  }, [session, tick, route]);

  useEffect(() => {
    if (!session) return;
    function onKey(e: KeyboardEvent): void {
      const tgt = e.target as HTMLElement | null;
      const inField = tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchQ("");
        setSearchOpen(true);
        return;
      }
      if (inField) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchQ("");
        setSearchOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session]);

  function onAuth(s: Session): void {
    saveSession(s);
    setSession(s);
    setRoute({ kind: "accueil" });
  }

  function onQuitter(): void {
    clearSession();
    resetStore();
    setSession(null);
    setEspaces([]);
    setBoardId(null);
  }

  if (!session) {
    return <Login onAuth={onAuth} />;
  }

  const espaceCourant =
    route.kind === "espace"
      ? espaces.find((e) => e.id === route.id) ?? null
      : route.kind === "tableau"
        ? espaces.find((e) => e.id === route.espaceId) ?? null
        : null;

  const crumbTitle = crumbFor(route, espaceCourant);

  return (
    <div className="shell">
      <Sidebar
        espaces={espaces}
        route={route}
        onNavigate={(r) => {
          setRoute(r);
          setBoardId(null);
        }}
        currentInitials={me?.initiales ?? "AD"}
        currentNom={me?.nom ?? "Membre"}
        onQuitter={onQuitter}
        nbNotifsNonLues={nbNotifs}
      />
      <div className="main">
        <Topbar
          crumb={crumbTitle.crumb}
          title={crumbTitle.title}
          onSearch={(q) => { setSearchQ(q); setSearchOpen(true); }}
          onOpenSearch={() => { setSearchQ(""); setSearchOpen(true); }}
        />
        <div className="main-scroll">
          {route.kind === "accueil" && (
            <Home
              espaces={espaces}
              onOuvrir={(id) => setRoute({ kind: "espace", id })}
              onCree={reloadEspaces}
              currentNom={me?.nom ?? ""}
            />
          )}
          {route.kind === "mes-cartes" && (
            <MesCartes moiId={me?.id ?? ""} onOuvrirEspace={(id) => setRoute({ kind: "espace", id })} />
          )}
          {route.kind === "calendrier" && (
            <CalendrierPage onOuvrirCarte={(espaceId, tableauId, carteId) => setRoute({ kind: "tableau", espaceId, id: tableauId, carteId })} />
          )}
          {route.kind === "notifications" && (
            <NotificationsPage onOuvrirEspace={(id) => setRoute({ kind: "espace", id })} />
          )}
          {route.kind === "profil" && (
            <ProfilPage onEnregistre={reloadEspaces} />
          )}
          {route.kind === "espace" && espaceCourant && (
            <EspacePage
              espace={espaceCourant}
              moiId={me?.id ?? ""}
              onChanged={reloadEspaces}
              onOuvrirTableau={(id) => setRoute({ kind: "tableau", espaceId: espaceCourant.id, id })}
              onOuvrirCarte={(espaceId, tableauId, carteId) => setRoute({ kind: "tableau", espaceId, id: tableauId, carteId })}
            />
          )}
          {route.kind === "tableau" && espaceCourant && (
            <TableauPage
              espace={espaceCourant}
              moiId={me?.id ?? ""}
              tableauId={route.id}
              carteInitiale={route.carteId ?? null}
              onRetour={() => setRoute({ kind: "espace", id: espaceCourant.id })}
              onChanged={reloadEspaces}
            />
          )}
          {((route.kind === "espace" || route.kind === "tableau") && !espaceCourant) && (
            <div className="page">
              <EmptyState titre="Accès refusé" description="Vous n'êtes pas membre de cet espace." />
            </div>
          )}
          {route.kind === "comite" && (boardId ? (
            <Board token={session.token} boardId={boardId} />
          ) : (
            <BoardList token={session.token} onOpen={setBoardId} />
          ))}
        </div>
      </div>
      {searchOpen && (
        <GlobalSearch
          initialQuery={searchQ}
          onClose={() => setSearchOpen(false)}
          onOuvrirEspace={(id) => setRoute({ kind: "espace", id })}
          onOuvrirTableau={(espaceId, id) => setRoute({ kind: "tableau", espaceId, id })}
          onOuvrirCarte={(espaceId, tableauId, carteId) => setRoute({ kind: "tableau", espaceId, id: tableauId, carteId })}
        />
      )}
      {helpOpen && <RaccourcisModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function crumbFor(route: Route, espace: Espace | null): { crumb: string; title: string } {
  switch (route.kind) {
    case "accueil":
      return { crumb: "ADSUM COLLABORATION", title: "Accueil" };
    case "mes-cartes":
      return { crumb: "PERSONNEL", title: "Mes cartes" };
    case "calendrier":
      return { crumb: "PERSONNEL", title: "Calendrier" };
    case "notifications":
      return { crumb: "PERSONNEL", title: "Notifications" };
    case "profil":
      return { crumb: "PERSONNEL", title: "Mon profil" };
    case "espace":
      return { crumb: "ESPACE", title: espace?.nom ?? "Espace" };
    case "tableau":
      return { crumb: espace?.nom.toUpperCase() ?? "TABLEAU", title: "Tableau" };
    case "comite":
      return { crumb: "SYSTÈME", title: "Comité (serveur)" };
  }
}
