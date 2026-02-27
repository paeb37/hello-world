"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const BASE_URL = "https://api.almostcrackd.ai";

const SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

type PipelineState =
  | { status: "idle" }
  | { status: "working"; step: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

async function readErrorBody(res: Response) {
  try {
    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export function ImageUploadPipelineForm() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<PipelineState>({ status: "idle" });

  const isWorking = state.status === "working";
  const accept = useMemo(
    () => Array.from(SUPPORTED_CONTENT_TYPES).join(","),
    [],
  );

  async function runPipeline(file: File) {
    const contentType = file.type;
    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
      throw new Error(
        `Unsupported file type: ${contentType || "(unknown)"}.\nSupported: ${Array.from(
          SUPPORTED_CONTENT_TYPES,
        ).join(", ")}`,
      );
    }

    setState({ status: "working", step: "Getting access token…" });
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("No access token found. Please sign in again.");
    }

    setState({ status: "working", step: "Step 1/4: Requesting upload URL…" });
    const presignRes = await fetch(`${BASE_URL}/pipeline/generate-presigned-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType }),
    });

    if (!presignRes.ok) {
      throw new Error(
        `Presign request failed: ${await readErrorBody(presignRes)}`,
      );
    }

    const presignJson = (await presignRes.json()) as {
      presignedUrl?: string;
      cdnUrl?: string;
    };

    if (!presignJson.presignedUrl || !presignJson.cdnUrl) {
      throw new Error("Presign response missing presignedUrl or cdnUrl.");
    }

    setState({ status: "working", step: "Step 2/4: Uploading image bytes…" });
    const putRes = await fetch(presignJson.presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed: ${await readErrorBody(putRes)}`);
    }

    setState({
      status: "working",
      step: "Step 3/4: Registering uploaded image URL…",
    });
    const registerRes = await fetch(`${BASE_URL}/pipeline/upload-image-from-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl: presignJson.cdnUrl, isCommonUse: false }),
    });

    if (!registerRes.ok) {
      throw new Error(
        `Register image failed: ${await readErrorBody(registerRes)}`,
      );
    }

    const registerJson = (await registerRes.json()) as { imageId?: string };
    const imageId = registerJson.imageId;
    if (!imageId) {
      throw new Error("Register response missing imageId.");
    }

    setState({ status: "working", step: "Step 4/4: Generating captions…" });
    const captionsRes = await fetch(`${BASE_URL}/pipeline/generate-captions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageId }),
    });

    if (!captionsRes.ok) {
      throw new Error(
        `Generate captions failed: ${await readErrorBody(captionsRes)}`,
      );
    }

    const captionsJson = (await captionsRes.json()) as unknown;
    const captionCount = Array.isArray(captionsJson) ? captionsJson.length : null;

    setState({
      status: "success",
      message:
        typeof captionCount === "number"
          ? `Generated ${captionCount} caption${captionCount === 1 ? "" : "s"}.`
          : "Captions generated successfully.",
    });

    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setState({ status: "error", message: "Choose an image file first." });
      return;
    }

    try {
      setState({ status: "idle" });
      await runPipeline(selectedFile);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const baseButton =
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Upload an image to generate captions
          </div>
          <div className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
            Uses a presigned upload URL, then registers the image and generates captions.
          </div>
        </div>

        <button
          type="submit"
          disabled={isWorking}
          className={[
            baseButton,
            "border-zinc-900 bg-zinc-900 text-white hover:bg-black dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white",
          ].join(" ")}
        >
          {isWorking ? "Working…" : "Generate captions"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          accept={accept}
          disabled={isWorking}
          onChange={(e) => {
            setState({ status: "idle" });
            setSelectedFile(e.currentTarget.files?.[0] ?? null);
          }}
          className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border file:border-zinc-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-50 dark:text-zinc-200 dark:file:border-zinc-800 dark:file:bg-zinc-950 dark:file:text-zinc-50 dark:hover:file:bg-zinc-900"
        />

        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {selectedFile ? (
            <span className="font-mono">
              {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </span>
          ) : (
            <span>Select a file.</span>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs">
        {state.status === "working" ? (
          <div className="text-zinc-600 dark:text-zinc-400">{state.step}</div>
        ) : null}

        {state.status === "error" ? (
          <div className="whitespace-pre-wrap text-rose-600 dark:text-rose-400">
            {state.message}
          </div>
        ) : null}

        {state.status === "success" ? (
          <div className="text-emerald-700 dark:text-emerald-300">
            {state.message}
          </div>
        ) : null}
      </div>
    </form>
  );
}

