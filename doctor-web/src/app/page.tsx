"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

export default function RootPage() {
  const { doctor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(doctor ? "/home" : "/login");
  }, [doctor, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-brand-700">
      Loading…
    </div>
  );
}
