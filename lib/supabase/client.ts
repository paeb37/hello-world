import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  // IMPORTANT: these must be referenced statically for Next.js to inline them
  // into the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local and Vercel environment variables.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local and Vercel environment variables.",
    );
  }

  return createBrowserClient(url, publishableKey, {
    auth: {
      flowType: "pkce",
    },
    // Allow cookies to work on http://localhost
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
}

