-- Debug checks: captions -> images URL resolution
-- Run these in the Supabase SQL Editor.

-- 1) Orphan check: captions whose image_id has no matching images.id
select
  c.id as caption_id,
  c.created_datetime_utc,
  c.image_id
from captions c
left join images i on i.id = c.image_id
where c.image_id is not null
  and i.id is null
order by c.created_datetime_utc desc
limit 200;

-- 2) Null/empty URL check: images with missing url
select
  i.id as image_id,
  i.url,
  i.is_public,
  i.created_datetime_utc
from images i
where i.url is null
   or i.url = ''
order by i.created_datetime_utc desc
limit 200;

-- 3) Captions pointing at images with null/empty URLs
select
  c.id as caption_id,
  c.created_datetime_utc,
  c.image_id
from captions c
join images i on i.id = c.image_id
where i.url is null
   or i.url = ''
order by c.created_datetime_utc desc
limit 200;

-- 4) Coverage: how many distinct caption image_ids are resolvable to a non-empty images.url
select
  count(distinct c.image_id) filter (where c.image_id is not null) as distinct_caption_image_ids,
  count(distinct i.id) filter (where i.url is not null and i.url <> '') as matching_images_with_url
from captions c
left join images i on i.id = c.image_id;

