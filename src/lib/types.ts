
export type RoleEspace = "proprietaire" | "admin" | "membre" | "observateur";
export type TypeEspace = "coordination" | "intendance" | "commission" | "direction" | "autre";
export type Priorite = "urgente" | "haute" | "normale" | "basse";
export type Complexite = 1 | 2 | 3 | 5 | 8;
export type VisibiliteTableau = "espace" | "prive";

export interface Membre {
  id: string;
  nom: string;
  courriel: string;
  initiales: string;
}

export interface MembreEspace {
  membre_id: string;
  role: RoleEspace;
}

export interface Etiquette {
  id: string;
  nom: string;
  couleur: string;
  par_defaut: boolean;
}

export interface Espace {
  id: string;
  nom: string;
  description: string;
  type: TypeEspace;
  couleur: string;
  initiale: string;
  membres: MembreEspace[];
  etiquettes: Etiquette[];
  observateurs_commentent: boolean;
  archive: boolean;
  invitation_jeton: string;
  demandes_acces: DemandeAcces[];
}

export interface DemandeAcces {
  id: string;
  membre_id: string;
  cree_le: string;
}

export interface ColonneProto {
  id: string;
  tableau_id: string;
  nom: string;
  position: number;
  couleur: string | null;
  repliee: boolean;
  wip: number | null;
  archivee: boolean;
}

export interface TableauProto {
  id: string;
  espace_id: string;
  nom: string;
  description: string;
  visibilite: VisibiliteTableau;
  participants: string[];
  favori: boolean;
  archive: boolean;
  modele: boolean;
  compteur_cartes: number;
  cree_le: string;
}

export interface ChecklistItem {
  id: string;
  texte: string;
  fait: boolean;
  assigne_id: string | null;
  assignes: string[];
  echeance: string | null;
}

export interface Checklist {
  id: string;
  titre: string;
  items: ChecklistItem[];
}

export type Rappel = "aucun" | "heure" | "1h" | "1j" | "2j";

export interface PieceJointe {
  id: string;
  nom: string;
  taille: number;
  type: string;
  cree_le: string;
  data_url: string | null;
  couverture: boolean;
}

export interface Reaction {
  membre_id: string;
  type: "pouce" | "coche";
}

export interface CommentaireProto {
  id: string;
  auteur_id: string;
  corps: string;
  cree_le: string;
  edite_le: string | null;
  reactions: Reaction[];
  pieces: PieceJointe[];
  lu_par: string[];
  mentions: string[];
}


export interface EntreeActivite {
  id: string;
  auteur_id: string;
  cree_le: string;
  texte: string;
}

export interface CarteProto {
  id: string;
  tableau_id: string;
  colonne_id: string;
  numero: number;
  titre: string;
  description: string;
  etiquettes: string[];
  assignes: string[];
  suiveurs: string[];
  debut: string | null;
  echeance: string | null;
  rappel: Rappel;
  priorite: Priorite;
  complexite: Complexite | null;
  position: number;
  checklists: Checklist[];
  pieces: PieceJointe[];
  commentaires: CommentaireProto[];
  activite: EntreeActivite[];
  archive: boolean;
  modele: boolean;
  couverture_id: string | null;
  publie?: boolean;
  evenement_id?: string | null;
}

export interface Notification {
  id: string;
  membre_id: string;
  type: "mention" | "assignation" | "echeance" | "carte_suivie" | "demande_acces";
  carte_id: string | null;
  espace_id: string | null;
  texte: string;
  cree_le: string;
  lue: boolean;
}

export interface HabillageColonneServeur {
  colonne_id: string;
  couleur: string | null;
  repliee: boolean;
  wip: number | null;
}
