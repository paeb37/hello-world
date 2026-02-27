import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs: number },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs);
  try {
    const { timeoutMs: _timeoutMs, ...rest } = init;
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("debug") !== "1") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: userError?.message ?? "Not signed in.",
      },
      { status: 401 },
    );
  }

  const { data: captions, error: captionsError } = await supabase
    .from("captions")
    .select("image_id, created_datetime_utc")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(50);

  if (captionsError) {
    return NextResponse.json(
      { ok: false, error: `captions select failed: ${captionsError.message}` },
      { status: 500 },
    );
  }

  const imageIds = Array.from(
    new Set((captions ?? []).map((c) => c.image_id).filter(Boolean)),
  ) as string[];

  // Pull a small sample of URLs.
  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("id, url")
    .in("id", imageIds)
    .not("url", "is", null)
    .limit(10);

  if (imagesError) {
    return NextResponse.json(
      { ok: false, error: `images select failed: ${imagesError.message}` },
      { status: 500 },
    );
  }

  const sample = (images ?? [])
    .filter((r) => typeof r.url === "string" && r.url.length > 0)
    .slice(0, 8) as Array<{ id: string; url: string }>;

  const results = await Promise.all(
    sample.map(async ({ id, url }) => {
      try {
        // Some hosts block HEAD; we fall back to a tiny ranged GET.
        const head = await fetchWithTimeout(url, {
          method: "HEAD",
          redirect: "follow",
          timeoutMs: 8000,
        });

        if (head.ok) {
          return {
            id,
            url,
            ok: true,
            method: "HEAD",
            status: head.status,
            contentType: head.headers.get("content-type"),
          };
        }

        const get = await fetchWithTimeout(url, {
          method: "GET",
          redirect: "follow",
          headers: { Range: "bytes=0-0" },
          timeoutMs: 8000,
        });

        return {
          id,
          url,
          ok: get.ok,
          method: "GET",
          status: get.status,
          contentType: get.headers.get("content-type"),
        };
      } catch (err) {
        return {
          id,
          url,
          ok: false,
          method: "fetch",
          status: null as number | null,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    }),
  );

  return NextResponse.json({
    ok: true,
    userId: user.id,
    sampled: results.length,
    results,
  });
}

