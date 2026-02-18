export type ImageRow = {
  id: string;
  created_datetime_utc: string;
  modified_datetime_utc: string | null;
  url: string | null;
  is_common_use: boolean | null;
  profile_id: string | null;
  additional_context: string | null;
  is_public: boolean | null;
  image_description: string | null;
  celebrity_recognition: string | null;
  embedding: unknown | null;
};

export type CaptionRow = {
  id: string;
  created_datetime_utc: string;
  modified_datetime_utc: string | null;
  content: string | null;
  is_public: boolean;
  profile_id: string;
  image_id: string;
  like_count: number;
};

export type CaptionVoteInsert = {
  caption_id: string;
  profile_id: string;
  vote_value: number;
  created_datetime_utc: string;
  modified_datetime_utc?: string | null;
};

