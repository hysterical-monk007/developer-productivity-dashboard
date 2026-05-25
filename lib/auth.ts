"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "devdash_session";

export function signIn() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "alex-chen");
  window.dispatchEvent(new Event("devdash:auth"));
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("devdash:auth"));
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(KEY));
}

export function useAuth() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setAuthed(isAuthed());
    sync();
    window.addEventListener("devdash:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("devdash:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return authed;
}

export function useRequireAuth() {
  const authed = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authed === false) router.replace("/");
  }, [authed, router]);
  return authed;
}

export function useRedirectIfAuthed() {
  const authed = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (authed === true) router.replace("/dashboard");
  }, [authed, router]);
  return authed;
}
