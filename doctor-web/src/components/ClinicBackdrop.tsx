/** Soft clinic atmosphere — matches doctor-mobile ClinicBackdrop. */
export function ClinicBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="absolute -right-[60px] -top-[80px] h-[260px] w-[260px] rounded-full opacity-90"
        style={{ backgroundColor: "var(--bg-accent)" }}
      />
      <div
        className="absolute -left-[90px] bottom-[80px] h-[280px] w-[280px] rounded-full opacity-85"
        style={{ backgroundColor: "var(--bg-soft)" }}
      />
      <div
        className="absolute left-0 right-0 top-[28%] h-[180px] -skew-y-[6deg]"
        style={{ backgroundColor: "#0f766e0F" }}
      />
    </div>
  );
}
