"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Search, Stethoscope, X } from "lucide-react";

import type { Appointment } from "@/lib/types";
import { formatDate, formatTime, statusLabel } from "@/lib/format";

export function doctorInitials(name?: string) {
  const parts = (name || "D").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "D";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PageLoader({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 shadow-sm">
          <Stethoscope size={22} strokeWidth={2} />
        </div>
      </div>
      {label ? (
        <p className="text-sm font-medium text-brand-800/80">{label}</p>
      ) : null}
    </div>
  );
}

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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}

const FORM_MAX: Record<"md" | "xl" | "2xl" | "3xl", string> = {
  md: "max-w-md",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

export function FormPage({
  children,
  maxWidth = "xl",
  className = "",
}: {
  children: React.ReactNode;
  maxWidth?: "md" | "xl" | "2xl" | "3xl";
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full ${FORM_MAX[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

export function FormActions({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>a]:contents [&>*]:w-full sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto ${className}`}
    >
      {children}
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
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
  },
) {
  const { label, hint, className = "", ...rest } = props;
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--text)]">
          {label}
        </span>
      ) : null}
      <input className={`${fieldClass} ${className}`} {...rest} />
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function PasswordInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: string;
    hint?: string;
  },
) {
  const { label, hint, className = "", ...rest } = props;
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--text)]">
          {label}
        </span>
      ) : null}
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          className={`${fieldClass} pr-11 ${className}`}
          {...rest}
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-brand-50 hover:text-brand-800"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
  },
) {
  const { label, hint, className = "", ...rest } = props;
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--text)]">
          {label}
        </span>
      ) : null}
      <textarea className={`${fieldClass} min-h-[100px] ${className}`} {...rest} />
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    hint?: string;
  },
) {
  const { label, hint, className = "", children, ...rest } = props;
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1.5 block font-medium text-[var(--text)]">
          {label}
        </span>
      ) : null}
      <select className={`${fieldClass} ${className}`} {...rest}>
        {children}
      </select>
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[var(--border)] bg-white py-2.5 pl-11 pr-10 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--muted)] hover:bg-brand-50 hover:text-brand-800"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "border border-[var(--border)] bg-white text-[var(--muted)] hover:border-brand-300 hover:text-brand-800"
            }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm ${className}`}
    >
      {title ? (
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
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
