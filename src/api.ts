// Client for the ADSUM committee collaboration API. Reserved to committee roles.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://adsum-api.vercel.app";

export type Role = "super_admin" | "admin" | "gestionnaire" | "direction" | string;

export interface Session {
  token: string;
  role: Role;
  email: string;
}

// Registered by the app: called when any request returns 401, so the stale
// session is purged and the user is sent back to the login screen instead of
// staying on a dead, signed-out view.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export interface Tableau {
  id: string;
  nom: string;
  description: string | null;
  cartes_total: number;
  cree_le: string | null;
}

export interface Colonne {
  id: string;
  nom: string;
  position: number;
}

export interface Carte {
  id: string;
  tableau_id: string;
  colonne_id: string;
  titre: string;
  description: string | null;
  type_activite: string | null;
  date_prevue: string | null;
  lieu: string | null;
  position: number;
  publie: boolean;
  evenement_id: string | null;
}

export interface TableauDetail {
  id: string;
  nom: string;
  description: string | null;
  colonnes: Colonne[];
  cartes: Carte[];
}

export interface Commentaire {
  id: string;
  auteur_nom: string | null;
  corps: string;
  cree_le: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function req<T>(path: string, token: string, init: RequestInit, onError: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    const message =
      res.status === 401 ? "Session expirée" : res.status === 403 ? "Accès refusé" : onError;
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status === 401 ? "Identifiants invalides" : "Service indisponible", res.status);
  }
  const data = (await res.json()) as { access_token: string; role?: Role };
  return { token: data.access_token, role: data.role ?? "", email };
}

export function getTableaux(token: string): Promise<Tableau[]> {
  return req<Tableau[]>("/api/v1/collaboration/tableaux", token, { method: "GET" }, "Tableaux indisponibles");
}

export function createTableau(token: string, nom: string, description?: string): Promise<TableauDetail> {
  return req<TableauDetail>(
    "/api/v1/collaboration/tableaux",
    token,
    { method: "POST", body: JSON.stringify({ nom, description }) },
    "Creation impossible",
  );
}

export function getTableau(token: string, id: string): Promise<TableauDetail> {
  return req<TableauDetail>(`/api/v1/collaboration/tableaux/${id}`, token, { method: "GET" }, "Tableau indisponible");
}

export interface CarteInput {
  tableau_id: string;
  colonne_id: string;
  titre: string;
  description?: string;
  type_activite?: string;
  date_prevue?: string;
  lieu?: string;
}

export function createCarte(token: string, input: CarteInput): Promise<Carte> {
  return req<Carte>(
    "/api/v1/collaboration/cartes",
    token,
    { method: "POST", body: JSON.stringify(input) },
    "Carte non creee",
  );
}

export function updateCarte(
  token: string,
  id: string,
  patch: Partial<Pick<Carte, "colonne_id" | "titre" | "description" | "type_activite" | "date_prevue" | "lieu" | "position">>,
): Promise<Carte> {
  return req<Carte>(
    `/api/v1/collaboration/cartes/${id}`,
    token,
    { method: "PATCH", body: JSON.stringify(patch) },
    "Mise a jour impossible",
  );
}

export function getCommentaires(token: string, carteId: string): Promise<Commentaire[]> {
  return req<Commentaire[]>(
    `/api/v1/collaboration/cartes/${carteId}/commentaires`,
    token,
    { method: "GET" },
    "Commentaires indisponibles",
  );
}

export function addCommentaire(token: string, carteId: string, corps: string): Promise<Commentaire> {
  return req<Commentaire>(
    `/api/v1/collaboration/cartes/${carteId}/commentaires`,
    token,
    { method: "POST", body: JSON.stringify({ corps }) },
    "Envoi impossible",
  );
}

export function publierCarte(token: string, carteId: string): Promise<Carte> {
  return req<Carte>(
    `/api/v1/collaboration/cartes/${carteId}/publier`,
    token,
    { method: "POST" },
    "Publication impossible",
  );
}

export interface CarteCalendrier {
  id: string;
  titre: string;
  date_prevue: string;
  lieu: string | null;
  type_activite: string | null;
  tableau_id: string;
  tableau_nom: string;
  publie: boolean;
  evenement_id: string | null;
}

/** Planned activities (cards carrying a date) across the committee boards, in the
 * [debut, fin] window. Powers the collaboration calendar. */
export function getCalendrier(token: string, debut: string, fin: string): Promise<CarteCalendrier[]> {
  const qs = new URLSearchParams({ debut, fin }).toString();
  return req<CarteCalendrier[]>(
    `/api/v1/collaboration/calendrier?${qs}`,
    token,
    { method: "GET" },
    "Calendrier indisponible",
  );
}

export function apiBaseUrl(): string {
  return BASE;
}
