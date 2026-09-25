"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(firebaseAuth(), (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
