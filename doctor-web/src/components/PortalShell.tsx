"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Home,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { doctorInitials, PageLoader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { skipWhatsAppPrompt, wasWhatsAppSkipped } from "@/lib/whatsappConnect";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/clinics", label: "Clinics", icon: Building2 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const COLLAPSE_KEY = "pc-sidebar-collapsed";

function navActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/appointments") return pathname.startsWith("/appointment");
  if (href === "/patients") return pathname.startsWith("/patient");
  if (href === "/clinics") return pathname.startsWith("/clinic");
  if (href === "/profile") {
    return (
      pathname.startsWith("/profile") || pathname.startsWith("/whatsapp")
    );
  }
  return false;
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { doctor, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [waPrompt, setWaPrompt] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!doctor) {
      router.replace("/login");
      return;
    }
    if (wasWhatsAppSkipped()) return;
    api
      .whatsappStatus()
      .then((s) => {
        if (!s.connected) setWaPrompt(true);
      })
      .catch(() => undefined);
  }, [doctor, loading, router]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <ClinicBackdrop />
        <PageLoader label="Loading portal…" />
      </div>
    );
  }

  if (!doctor) return null;

  const initials = doctorInitials(doctor.full_name);

  const profileChip = (
    <Link
      href="/profile"
      className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1.5 shadow-sm transition hover:border-brand-300"
      onClick={() => setOpen(false)}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {initials}
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-sm font-semibold text-[var(--text)]">
          Dr. {doctor.full_name}
        </span>
        <span className="block truncate text-xs text-[var(--muted)]">
          {doctor.email || "Doctor"}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="hidden shrink-0 text-[var(--muted)] sm:block"
      />
    </Link>
  );

  return (
    <div className="relative min-h-screen">
      <ClinicBackdrop />
      <div className="relative z-0 mx-auto flex min-h-screen max-w-7xl">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex transform flex-col border-r border-[var(--border)] bg-[var(--bg-soft)] p-3 transition-[width,transform] duration-200 ease-out md:static md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "md:w-[4.5rem]" : "w-64 md:w-64"} w-64`}
        >
          <div
            className={`mb-5 flex items-center gap-2 ${
              collapsed ? "md:flex-col md:justify-center" : "justify-between"
            }`}
          >
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                PatientCare
              </p>
              <h1 className="truncate text-lg font-bold text-[var(--text)]">
                Doctor Portal
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-2 text-[var(--muted)] transition hover:bg-brand-50 hover:text-brand-800 md:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-2 md:hidden"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = navActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    collapsed ? "md:justify-center md:px-2" : ""
                  } ${
                    active
                      ? "bg-brand-100 font-semibold text-brand-900 ring-1 ring-brand-200/80"
                      : "font-medium text-[var(--muted)] hover:bg-brand-50/60 hover:text-brand-800"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 ${active ? "text-brand-700" : ""}`}
                  />
                  <span className={collapsed ? "md:hidden" : ""}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            title="Sign out"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 ${
              collapsed ? "md:justify-center md:px-2" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Sign out</span>
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-soft)]/90 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3 px-4 py-3 md:px-8">
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-2 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              {collapsed ? (
                <button
                  type="button"
                  className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-2 text-[var(--muted)] transition hover:bg-brand-50 hover:text-brand-800 md:inline-flex"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen size={18} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text)] md:text-base">
                  Doctor Portal
                </p>
                <p className="hidden truncate text-xs text-[var(--muted)] md:block">
                  Clinics · Appointments · Marketing
                </p>
              </div>
              {profileChip}
            </div>
          </header>
          <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">
            {children}
          </main>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {waPrompt ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Connect WhatsApp</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Link your WhatsApp Business number so patients can book and receive
              visit updates.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/whatsapp/connect"
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setWaPrompt(false)}
              >
                Connect
              </Link>
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"
                onClick={() => {
                  skipWhatsAppPrompt();
                  setWaPrompt(false);
                }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
