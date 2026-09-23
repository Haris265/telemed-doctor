import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  api,
  clearAuth,
  getAccessToken,
  getStoredDoctor,
  getStoredUser,
  setAuth,
} from "./api";
import { storage } from "./storage";
import type { DoctorProfile, UserInfo } from "./types";

type AuthContextValue = {
  user: UserInfo | null;
  doctor: DoctorProfile | null;
  loading: boolean;
  signIn: (
    access: string,
    refresh: string,
    user: UserInfo,
    doctor: DoctorProfile,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function doctorSnapshot(d: DoctorProfile) {
  return [
    d.id,
    d.email,
    d.full_name,
    d.first_name,
    d.last_name,
    d.session_time,
    d.consultation_fee ?? "",
    d.bank_accounts?.map((b) => b.id).join(",") ?? "",
    d.is_active,
    d.specialities?.map((s) => s.id).join(",") ?? "",
  ].join("|");
}

function userSnapshot(u: UserInfo) {
  return [u.id, u.email, u.username, u.full_name, u.role].join("|");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserInfo | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUser();
        const storedDoctor = await getStoredDoctor();
        if (!storedUser || !storedDoctor) return;
        setUser(storedUser);
        setDoctor(storedDoctor);
        try {
          const me = await api.me();
          setDoctor(me);
          const access = await getAccessToken();
          const refresh = await storage.getItem("opd_doctor_refresh");
          if (access && refresh) await setAuth(access, refresh, storedUser, me);
        } catch (err) {
          if (err instanceof Error && err.message === "Unauthorized") {
            await clearAuth();
            setUser(null);
            setDoctor(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (
      access: string,
      refresh: string,
      nextUser: UserInfo,
      nextDoctor: DoctorProfile,
    ) => {
      await setAuth(access, refresh, nextUser, nextDoctor);
      setUser(nextUser);
      setDoctor(nextDoctor);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearAuth();
    setUser(null);
    setDoctor(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await api.me();
    const access = await getAccessToken();
    const refresh = await storage.getItem("opd_doctor_refresh");
    const currentUser = userRef.current;

    setDoctor((prev) => {
      if (prev && doctorSnapshot(prev) === doctorSnapshot(me)) return prev;
      return me;
    });

    if (currentUser && access && refresh) {
      const nextUser: UserInfo = {
        ...currentUser,
        email: me.email || currentUser.email,
        username: me.email || currentUser.username,
        full_name: me.full_name || currentUser.full_name,
      };
      if (userSnapshot(currentUser) !== userSnapshot(nextUser)) {
        setUser(nextUser);
        userRef.current = nextUser;
      }
      await setAuth(access, refresh, userRef.current ?? nextUser, me);
    }
  }, []);

  const value = useMemo(
    () => ({ user, doctor, loading, signIn, signOut, refreshMe }),
    [user, doctor, loading, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
