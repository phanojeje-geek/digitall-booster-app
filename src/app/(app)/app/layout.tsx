import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
