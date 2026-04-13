import type { ActivityReport, Client, Profile, Project, Task } from "@/lib/types";

const now = new Date().toISOString();

export const mockProfile: Profile = {
  id: "demo-user",
  full_name: "Demo User",
  role: "admin",
  created_at: now,
};

export const mockClients: Client[] = [
  {
    id: "c1",
    nom: "Alice Martin",
    entreprise: "Nova Studio",
    telephone: "0600000001",
    email: "alice@novastudio.com",
    statut: "prospect",
    owner_id: "demo-user",
    created_at: now,
  },
  {
    id: "c2",
    nom: "Karim Diallo",
    entreprise: "Pixel Agency",
    telephone: "0600000002",
    email: "karim@pixelagency.com",
    statut: "client",
    owner_id: "demo-user",
    created_at: now,
  },
];

export const mockProjects: Project[] = [
  {
    id: "p1",
    client_id: "c1",
    nom: "Refonte site vitrine",
    type: "site web",
    statut: "en cours",
    assigned_to: "demo-user",
    owner_id: "demo-user",
    created_at: now,
  },
  {
    id: "p2",
    client_id: "c2",
    nom: "Campagne SEO locale",
    type: "seo",
    statut: "en attente",
    assigned_to: "demo-user",
    owner_id: "demo-user",
    created_at: now,
  },
];

export const mockTasks: Task[] = [
  {
    id: "t1",
    project_id: "p1",
    titre: "Designer la hero section",
    description: "Version mobile prioritaire",
    assigned_to: "demo-user",
    statut: "in_progress",
    deadline: "2026-04-20",
    owner_id: "demo-user",
    created_at: now,
  },
  {
    id: "t2",
    project_id: "p2",
    titre: "Audit keywords",
    description: "Top 30 requetes",
    assigned_to: "demo-user",
    statut: "todo",
    deadline: "2026-04-24",
    owner_id: "demo-user",
    created_at: now,
  },
];

export const mockReports: ActivityReport[] = [
  {
    id: "r1",
    project_id: "p1",
    user_id: "demo-user",
    description: "Integration de la section hero + ajustements responsive.",
    screenshot_path: "/next.svg",
    status: "en cours",
    created_at: now,
  },
  {
    id: "r2",
    project_id: "p2",
    user_id: "demo-user",
    description: "Audit SEO complet livre et recommandations priorisees.",
    screenshot_path: "/next.svg",
    status: "termine",
    created_at: now,
  },
];

export const mockMembers = [{ id: "demo-user", full_name: "Demo User" }];

export const mockNotifications = [
  { id: "n1", message: "Nouveau client ajoute: Alice Martin", created_at: now, read: false },
  { id: "n2", message: "Projet cree: Refonte site vitrine", created_at: now, read: true },
];

export const mockFiles = [
  {
    id: "f1",
    file_name: "maquette-home.png",
    mime_type: "image/png",
    storage_path: "/next.svg",
    client_id: "c1",
    created_at: now,
  },
];

export const mockContents = [
  {
    id: "pc1",
    client_id: "c1",
    section: "hero",
    contenu: { title: "Boostez votre visibilite", subtitle: "Agence digitale 360" },
    created_at: now,
  },
];
