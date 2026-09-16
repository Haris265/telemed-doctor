"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { skipWhatsAppPrompt, wasWhatsAppSkipped } from "@/lib/whatsappConnect";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/clinics", label: "Clinics", icon: Building2 },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { doctor, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [waPrompt, setWaPrompt] = useState(false);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Loading…
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[var(--border)] bg-white p-4 transition md:static md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                PatientCare
              </p>
              <h1 className="text-lg font-bold text-[var(--text)]">Doctor Portal</h1>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 md:hidden"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p className="mb-4 truncate text-sm text-[var(--muted)]">
            Dr. {doctor.full_name}
          </p>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-[var(--muted)] hover:bg-brand-50/60 hover:text-brand-800"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-white/90 px-4 py-3 backdrop-blur md:hidden">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] p-2"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="font-semibold">Doctor Portal</span>
          </header>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
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
