export type SiteStatus = "En ligne" | "Brouillon" | "À revoir";

export type MosaicSite = {
  id: string; name: string; category: string; status: SiteStatus; url: string;
  description: string; tags: string[]; addedAt: string; lastAccessed: string;
  note?: string; accent: string; accentSecondary: string; mark: string;
};

// MOSAIC DATA — replace this array with your own links.
// accent + accentSecondary generate a refined abstract preview when no image exists.
export const sites: MosaicSite[] = [
  { id: "atelier", name: "Atelier", category: "Création", status: "En ligne", url: "https://atelier.example.com", description: "Un espace calme pour écrire, structurer et publier des idées qui comptent.", tags: ["écriture", "notes", "studio"], addedAt: "12 sept. 2026", lastAccessed: "Aujourd’hui, 09:42", note: "Penser à regarder les brouillons avant le week-end.", accent: "#d8ff62", accentSecondary: "#2abebd", mark: "A" },
  { id: "orbit", name: "Orbit", category: "Travail", status: "En ligne", url: "https://orbit.example.com", description: "La vue d’ensemble de vos projets et des choses à faire ensuite.", tags: ["projets", "priorités", "équipe"], addedAt: "08 sept. 2026", lastAccessed: "Hier, 16:10", accent: "#8ef7ff", accentSecondary: "#6c70ef", mark: "O" },
  { id: "room", name: "Room", category: "Inspiration", status: "À revoir", url: "https://room.example.com", description: "Une bibliothèque visuelle privée pour conserver les références fortes.", tags: ["moodboard", "design", "références"], addedAt: "03 sept. 2026", lastAccessed: "Lun. 14:28", accent: "#c6b5ff", accentSecondary: "#f4a6de", mark: "R" },
  { id: "field-notes", name: "Field Notes", category: "Création", status: "Brouillon", url: "https://notes.example.com", description: "Des fragments, croquis et directions à laisser infuser avant de les partager.", tags: ["journal", "recherche", "idées"], addedAt: "29 août 2026", lastAccessed: "29 août 2026", accent: "#ffcf70", accentSecondary: "#dc6e65", mark: "F" },
  { id: "pulse", name: "Pulse", category: "Veille", status: "En ligne", url: "https://pulse.example.com", description: "Un flux volontairement lent de signaux, de lectures et de personnes à suivre.", tags: ["lecture", "tendances", "signaux"], addedAt: "17 août 2026", lastAccessed: "Ven. 11:06", accent: "#ff8e82", accentSecondary: "#bb6aff", mark: "P" },
  { id: "index", name: "Index", category: "Utilitaires", status: "En ligne", url: "https://index.example.com", description: "Le raccourci simple vers les ressources, identifiants et outils du quotidien.", tags: ["outils", "archives", "liens"], addedAt: "04 août 2026", lastAccessed: "Jeu. 18:32", accent: "#67f0b5", accentSecondary: "#36a7ff", mark: "I" },
  { id: "shelter", name: "Shelter", category: "Personnel", status: "Brouillon", url: "https://shelter.example.com", description: "Un endroit personnel pour conserver ses listes, envies et petits rituels.", tags: ["perso", "listes", "rituels"], addedAt: "22 juil. 2026", lastAccessed: "12 sept. 2026", accent: "#fd9de8", accentSecondary: "#8b75ff", mark: "S" },
  { id: "atlas", name: "Atlas", category: "Inspiration", status: "En ligne", url: "https://atlas.example.com", description: "Des itinéraires, lieux et adresses que vous aurez envie de retrouver.", tags: ["voyage", "adresses", "cartes"], addedAt: "14 juil. 2026", lastAccessed: "05 sept. 2026", accent: "#b8e4ff", accentSecondary: "#5269d6", mark: "A" },
];
