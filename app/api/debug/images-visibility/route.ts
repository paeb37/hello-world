import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    .select("id, image_id, created_datetime_utc")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(200);

  if (captionsError) {
    return NextResponse.json(
      { ok: false, error: `captions select failed: ${captionsError.message}` },
      { status: 500 },
    );
  }

  const imageIds = Array.from(
    new Set((captions ?? []).map((c) => c.image_id).filter(Boolean)),
  ) as string[];

  const chunkSize = 200;
  const allRows: Array<{ id: string; url: string | null; is_public?: boolean | null }> =
    [];
  const chunkErrors: string[] = [];

  for (let i = 0; i < imageIds.length; i += chunkSize) {
    const chunk = imageIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("images")
      .select("id, url, is_public")
      .in("id", chunk);

    if (error) {
      chunkErrors.push(`chunk ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
      continue;
    }

    if (data && data.length > 0) {
      allRows.push(
        ...(data as unknown as Array<{
          id: string;
          url: string | null;
          is_public?: boolean | null;
        }>),
      );
    }
  }

  const visibleIdSet = new Set(allRows.map((r) => r.id));
  const missingIds = imageIds.filter((id) => !visibleIdSet.has(id));

  const privateVisible = allRows.filter((r) => r.is_public === false);
  const publicVisible = allRows.filter((r) => r.is_public === true);
  const unknownVisibility = allRows.filter((r) => r.is_public == null);
  const nullUrlVisible = allRows.filter((r) => !r.url);

  return NextResponse.json({
    ok: true,
    userId: user.id,
    captionsConsidered: (captions ?? []).length,
    distinctImageIdsRequested: imageIds.length,
    imagesRowsReturned: allRows.length,
    chunkErrors,
    missingIdsCount: missingIds.length,
    sampleMissingIds: missingIds.slice(0, 25),
    visibilityBreakdown: {
      public: publicVisible.length,
      private: privateVisible.length,
      unknown: unknownVisibility.length,
    },
    nullUrlCount: nullUrlVisible.length,
    sampleNullUrlIds: nullUrlVisible.slice(0, 25).map((r) => r.id),
    samplePrivateIds: privateVisible.slice(0, 25).map((r) => r.id),
  });
}

