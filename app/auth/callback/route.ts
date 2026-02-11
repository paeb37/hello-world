import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function requireEnv(
  ...names: Array<
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    | "SUPABASE_URL"
    | "SUPABASE_ANON_KEY"
  >
): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (recommended), or SUPABASE_URL and SUPABASE_ANON_KEY.",
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const publishableKey = requireEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    );

    const cookieStore = await cookies();
    const supabase = createServerClient(url, publishableKey, {
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });

    await supabase.auth.exchangeCodeForSession(code);
  }

  // After the OAuth flow completes, send the user to the app root.
  return NextResponse.redirect(requestUrl.origin);
}

