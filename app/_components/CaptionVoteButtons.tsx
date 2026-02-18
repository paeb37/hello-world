"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  captionId: string;
  profileId: string;
  initialLikeCount?: number;
};

export function CaptionVoteButtons({
  captionId,
  profileId,
  initialLikeCount,
}: Props) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitVote(voteValue: number) {
    try {
      setErrorMessage(null);
      setIsWorking(true);

      const { error } = await supabase.from("caption_votes").insert({
        caption_id: captionId,
        profile_id: profileId,
        vote_value: voteValue,
        created_datetime_utc: new Date().toISOString(),
      });

      if (error) {
        // Postgres unique violation (one vote per user per caption)
        if ((error as { code?: string }).code === "23505") {
          setErrorMessage("You already voted on this caption.");
          return;
        }

        setErrorMessage(error.message);
        return;
      }

      router.refresh();
    } finally {
      setIsWorking(false);
    }
  }

  const base =
    "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isWorking}
          onClick={() => submitVote(1)}
          className={[
            base,
            "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
          ].join(" ")}
        >
          Upvote
        </button>
        <button
          type="button"
          disabled={isWorking}
          onClick={() => submitVote(-1)}
          className={[
            base,
            "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
          ].join(" ")}
        >
          Downvote
        </button>
        {typeof initialLikeCount === "number" ? (
          <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400">
            {initialLikeCount} like{initialLikeCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {errorMessage ? (
        <div className="text-[11px] text-rose-600 dark:text-rose-400">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

