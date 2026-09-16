import { PortalShell } from "@/components/PortalShell";

export default function DetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}
