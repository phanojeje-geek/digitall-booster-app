export type Role = "admin" | "commercial" | "marketing" | "dev" | "designer";

export type ClientStatus = "prospect" | "en cours" | "client";
export type ProjectStatus = "en attente" | "en cours" | "termine";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ReportStatus = "en cours" | "termine";

export type Profile = {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: Role;
  sales_group?: "groupe-a" | "groupe-b" | "groupe-c";
  is_blocked?: boolean;
  access_reset_at?: string | null;
  connection_status?: "online" | "offline";
  last_login_at?: string | null;
  last_logout_at?: string | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  last_geo_label?: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  nom: string;
  entreprise: string | null;
  telephone: string | null;
  email: string;
  statut: ClientStatus;
  owner_id: string;
  intake_data?: Record<string, unknown> | null;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  nom: string;
  type: string;
  statut: ProjectStatus;
  assigned_to: string | null;
  owner_id: string;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  titre: string;
  description: string | null;
  assigned_to: string | null;
  statut: TaskStatus;
  deadline: string | null;
  owner_id: string;
  created_at: string;
};

export type ActivityReport = {
  id: string;
  project_id: string;
  user_id: string;
  description: string;
  screenshot_path: string;
  status: ReportStatus;
  created_at: string;
};
