"use client";

import Link from "next/link";

import type { Appointment } from "@/lib/types";
import { formatDate, formatTime, statusLabel } from "@/lib/format";

export function AppointmentCard({
  appointment,
  detailed,
}: {
  appointment: Appointment;
  detailed?: boolean;
}) {
  return (
    <Link
      href={`/appointment/${appointment.id}`}
      className="block rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--text)]">
            {appointment.patient_name}
          </p>
          <p className="text-sm text-[var(--muted)]">{appointment.patient_phone}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
          {statusLabel(appointment.status)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
        <span>Token {appointment.token_code}</span>
        <span>{formatDate(appointment.scheduled_at)}</span>
        <span>{formatTime(appointment.scheduled_at)}</span>
        {detailed && appointment.clinic_name ? (
          <span>{appointment.clinic_name}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:border-brand-300">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-800">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "border border-[var(--border)] bg-white hover:bg-brand-50";
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string },
) {
  const { label, className = "", ...rest } = props;
  return (
    <label className="block text-sm">
      {label ? <span className="mb-1.5 block font-medium">{label}</span> : null}
      <input
        className={`w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 outline-none focus:border-brand-500 ${className}`}
        {...rest}
      />
    </label>
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string },
) {
  const { label, className = "", ...rest } = props;
  return (
    <label className="block text-sm">
      {label ? <span className="mb-1.5 block font-medium">{label}</span> : null}
      <textarea
        className={`w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 outline-none focus:border-brand-500 ${className}`}
        {...rest}
      />
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/70 p-8 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-red-600">{children}</p>;
}
