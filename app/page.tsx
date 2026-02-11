import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ImageRow } from "@/types/supabase";
import { AuthGate } from "@/app/_components/AuthGate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ImageListRow = Pick<
  ImageRow,
  | "id"
  | "created_datetime_utc"
  | "url"
  | "image_description"
  | "additional_context"
  | "is_public"
  | "celebrity_recognition"
>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

export default async function Home() {
  const auth = await (async () => {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client.auth.getUser();
      return {
        supabase: client,
        isSignedIn: Boolean(data.user) && !error,
        authErrorMessage: error?.message ?? null,
      };
    } catch (err) {
      return {
        supabase: null,
        isSignedIn: false,
        authErrorMessage: err instanceof Error ? err.message : "Unknown error",
      };
    }
  })();

  if (!auth.supabase || !auth.isSignedIn) {
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
  let images: ImageListRow[] = [];
  let errorMessage: string | null = null;

  try {
    const { data, error } = await supabase
      .from("images")
      .select(
        "id, created_datetime_utc, url, image_description, additional_context, is_public, celebrity_recognition",
      )
      .order("created_datetime_utc", { ascending: false });

    if (error) {
      errorMessage = error.message;
    } else {
      images = (data ?? []) as ImageListRow[];
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <main className="mx-auto w-full max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight">Images</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Couldn’t load images from Supabase.
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
            <h1 className="text-2xl font-semibold tracking-tight">Images</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Read-only feed from Supabase table <span className="font-mono">images</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {images.length} result{images.length === 1 ? "" : "s"}
            </div>
            <AuthGate signedIn compact />
          </div>
        </header>

        {images.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No images yet.
          </div>
        ) : (
          <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => {
              const title =
                image.image_description ??
                image.additional_context ??
                image.celebrity_recognition ??
                "Untitled";
              const isPublic = image.is_public === true;

              return (
                <article
                  key={image.id}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {image.url ? (
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-full w-full"
                        title="Open image in new tab"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
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

                    <dl className="grid grid-cols-1 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-medium text-zinc-500 dark:text-zinc-500">
                          Created
                        </dt>
                        <dd className="font-mono">
                          {formatDate(image.created_datetime_utc)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-medium text-zinc-500 dark:text-zinc-500">
                          ID
                        </dt>
                        <dd className="max-w-[22ch] truncate font-mono">
                          {image.id}
                        </dd>
                      </div>
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
