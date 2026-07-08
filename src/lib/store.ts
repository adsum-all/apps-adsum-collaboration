// Real collaboration data layer. Same function surface as the prototype's
// the localStorage store, but every call reaches the ADSUM collaboration API. No seed, no
// localStorage, no mock, no localStorage prototype layer. Split across store-tableaux and store-cartes
// to stay small; this module re-exports them so components import one path.
import type { Session } from "../api.js";
import type {
  CarteProto,
  Espace,
  Etiquette,
  Membre,
  Notification,
  Priorite,
  RoleEspace,
  TypeEspace,
} from "./types.js";
import { cachedMe, jbody, request, resetToken, resolveMe, setMe, setToken } from "./http.js";

const B = "/api/v1/collaboration";

// Session lifecycle. Caches the token immediately and resolves the current
// member, returning it so the caller can put it in state (call this once from an
// effect, never on every render).
export function initStore(session: Session): Promise<Membre | null> {
  setToken(session.token);
  return resolveMe(session)
    .then((m) => {
      setMe(m);
      return m;
    })
    .catch(() => {
      setMe(null);
      return null;
    });
}

export function resetStore(): void {
  resetToken();
}

export function currentMembre(): Membre {
  const m = cachedMe();
  if (!m) throw new Error("Membre courant non resolu");
  return m;
}

// Spaces
export function listEspaces(): Promise<Espace[]> {
  return request(`${B}/espaces`, { method: "GET" }, "Espaces indisponibles");
}
export function getEspace(id: string): Promise<Espace | null> {
  return request(`${B}/espaces/${id}`, { method: "GET" }, "Espace indisponible");
}
export function listMembres(): Promise<Membre[]> {
  return request(`${B}/membres`, { method: "GET" }, "Membres indisponibles");
}
export function createEspace(input: Pick<Espace, "nom" | "description" | "type" | "couleur">): Promise<Espace> {
  return request(`${B}/espaces`, { method: "POST", body: jbody(input) }, "Espace non cree");
}
export function updateEspace(
  id: string,
  patch: Partial<Pick<Espace, "nom" | "description" | "observateurs_commentent" | "archive">>,
): Promise<Espace> {
  return request(`${B}/espaces/${id}`, { method: "PATCH", body: jbody(patch) }, "Espace non mis a jour");
}
export function toggleArchiveEspace(id: string, archive: boolean): Promise<void> {
  return request(`${B}/espaces/${id}`, { method: "PATCH", body: jbody({ archive }) }, "Archivage impossible").then(
    () => undefined,
  );
}

// Members and access requests
export function addMembreEspace(espaceId: string, membreId: string, role: RoleEspace): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/membres`, { method: "POST", body: jbody({ membre_id: membreId, role }) }, "Ajout impossible");
}
export function changeRoleMembre(espaceId: string, membreId: string, role: RoleEspace): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/membres/${membreId}`, { method: "PATCH", body: jbody({ role }) }, "Role non change");
}
export function removeMembreEspace(espaceId: string, membreId: string): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/membres/${membreId}`, { method: "DELETE" }, "Retrait impossible");
}
export function demanderAcces(espaceId: string, membreId: string): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/demandes`, { method: "POST", body: jbody({ membre_id: membreId }) }, "Demande impossible");
}
export function accepterDemande(espaceId: string, demandeId: string, role: RoleEspace = "membre"): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/demandes/${demandeId}/accepter`, { method: "POST", body: jbody({ role }) }, "Action impossible");
}
export function refuserDemande(espaceId: string, demandeId: string): Promise<Espace> {
  return request(`${B}/espaces/${espaceId}/demandes/${demandeId}`, { method: "DELETE" }, "Action impossible");
}

export interface RejoindreResultat {
  espace_id: string;
  espace_nom: string;
  statut: string;
}

/** Follow an invitation link: files an access request for the current member
 * (or reports they are already a member). */
export function rejoindreEspace(jeton: string): Promise<RejoindreResultat> {
  return request(`${B}/rejoindre/${encodeURIComponent(jeton)}`, { method: "POST" }, "Invitation invalide");
}

// Labels
export function createEtiquette(espaceId: string, input: Omit<Etiquette, "id">): Promise<Etiquette> {
  return request(`${B}/espaces/${espaceId}/etiquettes`, { method: "POST", body: jbody(input) }, "Etiquette non creee");
}
export function updateEtiquette(espaceId: string, id: string, patch: Partial<Etiquette>): Promise<Etiquette> {
  return request(`${B}/espaces/${espaceId}/etiquettes/${id}`, { method: "PATCH", body: jbody(patch) }, "Etiquette non mise a jour");
}
export function deleteEtiquette(espaceId: string, id: string): Promise<void> {
  return request(`${B}/espaces/${espaceId}/etiquettes/${id}`, { method: "DELETE" }, "Etiquette non supprimee");
}

// Current member profile (read-only: identity is managed centrally in the back
// office and governed by the civil-identity rules, so collaboration only reads it).
export function getMoi(): Promise<Membre> {
  return request<Membre>(`${B}/moi`, { method: "GET" }, "Profil indisponible").then((m) => {
    setMe(m);
    return m;
  });
}

// Notifications
export function listNotifications(): Promise<Notification[]> {
  return request(`${B}/notifications`, { method: "GET" }, "Notifications indisponibles");
}
export function marquerNotifLue(id: string): Promise<void> {
  return request(`${B}/notifications/${id}/lue`, { method: "POST" }, "Action impossible");
}
export function marquerToutesNotifsLues(): Promise<void> {
  return request(`${B}/notifications/toutes-lues`, { method: "POST" }, "Action impossible");
}

// Calendar / my cards with a due date
export function listCartesAvecEcheance(): Promise<Array<CarteProto & { espace_id: string | null }>> {
  return request(`${B}/cartes-echeance`, { method: "GET" }, "Echeances indisponibles");
}

// Real activities published from the visible spaces (same rows as the member
// agenda and the back office), so the collaboration calendar stays aligned.
export interface ActivitePubliee {
  id: string;
  carte_id: string;
  tableau_id: string;
  espace_id: string | null;
  titre: string;
  type: string | null;
  debut: string | null;
  lieu: string | null;
}
export function listActivitesPubliees(): Promise<ActivitePubliee[]> {
  return request(`${B}/activites`, { method: "GET" }, "Activités indisponibles");
}

// Stats
export interface StatsGlobales {
  espaces: number;
  tableaux: number;
  cartes: number;
  enRetard: number;
  termineesSemaine: number;
}
export function statsGlobales(): Promise<StatsGlobales> {
  return request(`${B}/stats`, { method: "GET" }, "Statistiques indisponibles");
}
export interface StatsEspace {
  tableaux: number;
  cartes: number;
  parPriorite: Record<Priorite, number>;
  parEtiquette: Array<{ id: string; nom: string; couleur: string; count: number }>;
  parAssigne: Array<{ id: string; nom: string; count: number }>;
}
export function statsEspace(espaceId: string): Promise<StatsEspace> {
  return request(`${B}/espaces/${espaceId}/stats`, { method: "GET" }, "Statistiques indisponibles");
}

// Search
export type ResultatRecherche =
  | { kind: "espace"; id: string; titre: string; sous_titre: string }
  | { kind: "tableau"; id: string; espace_id: string; titre: string; sous_titre: string }
  | { kind: "carte"; id: string; tableau_id: string; espace_id: string; titre: string; sous_titre: string };

export function rechercher(q: string): Promise<ResultatRecherche[]> {
  const query = q.trim();
  if (query.length === 0) return Promise.resolve([]);
  return request(`${B}/recherche?q=${encodeURIComponent(query)}`, { method: "GET" }, "Recherche indisponible");
}

export const PRIORITES: Priorite[] = ["urgente", "haute", "normale", "basse"];
export const TYPES_ESPACE: TypeEspace[] = ["coordination", "intendance", "commission", "direction", "autre"];

export * from "./store-tableaux.js";
export * from "./store-cartes.js";
