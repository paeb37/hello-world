import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuthGate } from "@/app/_components/AuthGate";
import { CaptionVoteButtons } from "@/app/_components/CaptionVoteButtons";
import { ImageUploadPipelineForm } from "@/app/_components/ImageUploadPipelineForm";
import type { CaptionRow } from "@/types/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CaptionListRow = Pick<
  CaptionRow,
  "id" | "created_datetime_utc" | "content" | "is_public" | "like_count" | "image_id"
> & {
  images: { url: string | null } | null;
};

type PageProps = {
  searchParams?:
    | Promise<{
        debugImages?: string;
      }>
    | {
        debugImages?: string;
      };
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const debugImages = resolvedSearchParams?.debugImages === "1";

  const auth = await (async () => {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client.auth.getUser();
      return {
        supabase: client,
        isSignedIn: Boolean(data.user) && !error,
        userId: data.user?.id ?? null,
        authErrorMessage: error?.message ?? null,
      };
    } catch (err) {
      return {
        supabase: null,
        isSignedIn: false,
        userId: null,
        authErrorMessage: err instanceof Error ? err.message : "Unknown error",
      };
    }
  })();

  if (!auth.supabase || !auth.isSignedIn || !auth.userId) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in required
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            To view this page, sign in with Google.
          </p>
          <div className="mt-8">
            <AuthGate signedIn={false} />
          </div>

          {auth.authErrorMessage ? (
            <pre className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {auth.authErrorMessage}
            </pre>
          ) : null}
        </main>
      </div>
    );
  }

  const supabase = auth.supabase;
  const profileId = auth.userId;
  let captions: CaptionListRow[] = [];
  let errorMessage: string | null = null;
  let debugImagesQueryError: string | null = null;

  try {
    const { data, error } = await supabase
      .from("captions")
      .select(
        "id, created_datetime_utc, content, is_public, like_count, image_id, images!inner(url)",
      )
      .not("content", "is", null)
      .neq("content", "")
      .order("created_datetime_utc", { ascending: false });

    if (error) {
      errorMessage = error.message;
    } else {
      captions = (data ?? []) as unknown as CaptionListRow[];
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (debugImages) {
      debugImagesQueryError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight">Captions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Couldn’t load captions from Supabase.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {errorMessage}
          </pre>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Captions</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Read-only feed from Supabase table{" "}
              <span className="font-mono">captions</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {captions.length} result{captions.length === 1 ? "" : "s"}
            </div>
            <AuthGate signedIn compact />
          </div>
        </header>

        {debugImages ? (
          <details className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Debug: image URL resolution
            </summary>
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="font-medium text-zinc-600 dark:text-zinc-400">
                    Captions loaded
                  </div>
                  <div className="font-mono">{captions.length}</div>
                </div>
                <div>
                  <div className="font-medium text-zinc-600 dark:text-zinc-400">
                    Captions with joined image row
                  </div>
                  <div className="font-mono">{captions.length}</div>
                </div>
                <div>
                  <div className="font-medium text-zinc-600 dark:text-zinc-400">
                    URLs mapped (non-null)
                  </div>
                  <div className="font-mono">
                    {captions.filter((caption) => Boolean(caption.images?.url)).length}
                  </div>
                </div>
              </div>

              {debugImagesQueryError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                  <div className="font-semibold">Captions/images query error</div>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                    {debugImagesQueryError}
                  </pre>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        <ImageUploadPipelineForm />

        {captions.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No captions yet.
          </div>
        ) : (
          <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {captions.map((caption) => {
              const title = caption.content ?? "(empty caption)";
              const isPublic = caption.is_public === true;
              const imageUrl = caption.images?.url ?? null;

              return (
                <article
                  key={caption.id}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-full w-full"
                        title="Open image in new tab"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </a>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                        No URL
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-50">
                        {title}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isPublic
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {isPublic ? "public" : "private"}
                      </span>
                    </div>

                    <CaptionVoteButtons
                      captionId={caption.id}
                      profileId={profileId}
                      initialLikeCount={caption.like_count}
                    />

                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <dt className="font-medium text-zinc-500 dark:text-zinc-500">
                        Created
                      </dt>
                      <dd className="justify-self-end font-mono">
                        {formatDate(caption.created_datetime_utc)}
                      </dd>

                      <dt className="font-medium text-zinc-500 dark:text-zinc-500">
                        ID
                      </dt>
                      <dd className="max-w-[22ch] justify-self-end truncate font-mono">
                        {caption.id}
                      </dd>
                    </dl>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
