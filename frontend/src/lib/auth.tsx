"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminSession, setTokenGetter } from "./api";
import { devAuth, firebaseAuth, firebaseConfigured } from "./firebase";

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  available: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const DEV_KEY = "rise-dev-user";

function friendly(e: unknown): Error {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/network-request-failed": "Network problem. Check your connection.",
  };
  return new Error(map[code] || (e instanceof Error ? e.message : "Something went wrong."));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseConfigured) {
      const auth = firebaseAuth()!;
      setTokenGetter(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
      return onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, email: u.email ?? "", name: u.displayName ?? "" } : null);
        setLoading(false);
      });
    }
    if (devAuth) {
      const read = () => {
        try {
          const raw = localStorage.getItem(DEV_KEY);
          return raw ? (JSON.parse(raw) as SessionUser) : null;
        } catch {
          return null;
        }
      };
      setTokenGetter(async () => {
        const u = read();
        return u ? `dev:${u.uid}:${u.email}` : null;
      });
      setUser(read());
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (devAuth && !firebaseConfigured) {
      const u = { uid: email.toLowerCase(), email, name: email.split("@")[0]! };
      localStorage.setItem(DEV_KEY, JSON.stringify(u));
      setUser(u);
      return;
    }
    try {
      await signInWithEmailAndPassword(firebaseAuth()!, email, password);
    } catch (e) {
      throw friendly(e);
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (devAuth && !firebaseConfigured) return signIn(email, password);
      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth()!, email, password);
        await updateProfile(cred.user, { displayName: name });
        await sendEmailVerification(cred.user).catch(() => {});
        setUser({ uid: cred.user.uid, email, name });
      } catch (e) {
        throw friendly(e);
      }
    },
    [signIn],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(firebaseAuth()!, new GoogleAuthProvider());
    } catch (e) {
      throw friendly(e);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth()!, email);
    } catch (e) {
      throw friendly(e);
    }
  }, []);

  const signOut = useCallback(async () => {
    adminSession.clear();
    if (firebaseConfigured) await fbSignOut(firebaseAuth()!);
    else {
      localStorage.removeItem(DEV_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      available: firebaseConfigured || devAuth,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
    }),
    [user, loading, signIn, signUp, signInWithGoogle, resetPassword, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
