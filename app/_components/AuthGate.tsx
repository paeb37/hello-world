"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  signedIn: boolean;
  compact?: boolean;
};

export function AuthGate({ signedIn, compact }: Props) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const supabase = getSupabaseBrowserClient();

  async function handleSignIn() {
    try {
      setIsWorking(true);
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsWorking(true);
      await supabase.auth.signOut();
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  }

  const base =
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60";

  if (signedIn) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isWorking}
        className={[
          base,
          "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
          compact ? "px-3 py-1.5 text-xs rounded-lg" : "",
        ].join(" ")}
      >
        {isWorking ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isWorking}
      className={[
        base,
        "border-zinc-900 bg-zinc-900 text-white hover:bg-black dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white",
      ].join(" ")}
    >
      {isWorking ? "Redirecting…" : "Sign in with Google"}
    </button>
  );
}

