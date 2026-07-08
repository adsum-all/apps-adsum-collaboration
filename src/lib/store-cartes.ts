// Cards, columns, checklists, comments and reactions: real API calls that mirror
// the prototype store surface. Endpoints live under /api/v1/collaboration.
import type { CarteProto, ColonneProto, CommentaireProto } from "./types.js";
import { request, jbody } from "./http.js";

const B = "/api/v1/collaboration";

// Columns
export function listColonnes(tableauId: string): Promise<ColonneProto[]> {
  return request(`${B}/tableaux/${tableauId}/colonnes`, { method: "GET" }, "Colonnes indisponibles");
}
export function createColonne(tableauId: string, nom: string): Promise<ColonneProto> {
  return request(`${B}/tableaux/${tableauId}/colonnes`, { method: "POST", body: jbody({ nom }) }, "Colonne non creee");
}
export function updateColonne(id: string, patch: Partial<ColonneProto>): Promise<ColonneProto> {
  return request(`${B}/colonnes/${id}`, { method: "PATCH", body: jbody(patch) }, "Colonne non mise a jour");
}
export function deleteColonne(id: string): Promise<void> {
  return request(`${B}/colonnes/${id}`, { method: "DELETE" }, "Colonne non supprimee");
}

// Cards
export function listCartes(tableauId: string): Promise<CarteProto[]> {
  return request(`${B}/tableaux/${tableauId}/cartes`, { method: "GET" }, "Cartes indisponibles");
}
export function listMesCartes(): Promise<CarteProto[]> {
  return request(`${B}/mes-cartes`, { method: "GET" }, "Cartes indisponibles");
}
export function createCarteProto(input: { tableau_id: string; colonne_id: string; titre: string }): Promise<CarteProto> {
  return request(`${B}/cartes-espace`, { method: "POST", body: jbody(input) }, "Carte non creee");
}
export function updateCarteProto(id: string, patch: Partial<CarteProto>): Promise<CarteProto> {
  return request(`${B}/cartes-espace/${id}`, { method: "PATCH", body: jbody(patch) }, "Carte non mise a jour");
}
export function deleteCarteProto(id: string): Promise<void> {
  return request(`${B}/cartes-espace/${id}`, { method: "DELETE" }, "Carte non supprimee");
}
export function moveCarte(carteId: string, toColonneId: string, toIndex: number): Promise<CarteProto> {
  return request(
    `${B}/cartes-espace/${carteId}/deplacer`,
    { method: "POST", body: jbody({ colonne_id: toColonneId, position: toIndex }) },
    "Deplacement impossible",
  );
}
export function duplicateCarte(carteId: string): Promise<CarteProto> {
  return request(`${B}/cartes-espace/${carteId}/dupliquer`, { method: "POST" }, "Duplication impossible");
}
export function deplacerCarteVersTableau(carteId: string, tableauCibleId: string): Promise<CarteProto> {
  return request(
    `${B}/cartes-espace/${carteId}/deplacer-tableau`,
    { method: "POST", body: jbody({ tableau_id: tableauCibleId }) },
    "Deplacement impossible",
  );
}
export function toggleArchiveCarte(carteId: string, archive: boolean): Promise<void> {
  return request(
    `${B}/cartes-espace/${carteId}/archive`,
    { method: "POST", body: jbody({ archive }) },
    "Archivage impossible",
  );
}
export function listCartesArchivees(tableauId: string): Promise<CarteProto[]> {
  return request(`${B}/tableaux/${tableauId}/cartes-archivees`, { method: "GET" }, "Cartes indisponibles");
}

// Checklists
export function toggleChecklistItem(carteId: string, checklistId: string, itemId: string): Promise<void> {
  return request(
    `${B}/checklist-items/${itemId}/basculer`,
    { method: "POST", body: jbody({ carte_id: carteId, checklist_id: checklistId }) },
    "Action impossible",
  );
}
export function ajouterChecklist(carteId: string, titre: string): Promise<void> {
  return request(`${B}/cartes-espace/${carteId}/checklists`, { method: "POST", body: jbody({ titre }) }, "Ajout impossible");
}
export function ajouterChecklistItem(carteId: string, checklistId: string, texte: string): Promise<void> {
  return request(
    `${B}/checklists/${checklistId}/items`,
    { method: "POST", body: jbody({ carte_id: carteId, texte }) },
    "Ajout impossible",
  );
}

// Comments and reactions
export function ajouterCommentaire(carteId: string, corps: string): Promise<CommentaireProto> {
  return request(`${B}/cartes-espace/${carteId}/commentaires`, { method: "POST", body: jbody({ corps }) }, "Envoi impossible");
}
export function marquerCommentairesLus(carteId: string): Promise<void> {
  return request(`${B}/cartes-espace/${carteId}/lu`, { method: "POST" }, "Action impossible");
}
export function reagirCommentaire(carteId: string, commentaireId: string, type: "pouce" | "coche"): Promise<void> {
  return request(
    `${B}/commentaires/${commentaireId}/reaction`,
    { method: "POST", body: jbody({ carte_id: carteId, type }) },
    "Reaction impossible",
  );
}
