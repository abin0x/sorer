CREATE OR REPLACE FUNCTION public.beacon_count_report()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE reporters integer;
BEGIN
  SELECT count(DISTINCT coalesce(reporter_user_id::text, lower(reporter_email))) INTO reporters
    FROM public.beacon_reports WHERE message_id = NEW.message_id;
  -- Reports flag a post for staff review; they never hide it automatically,
  -- so members cannot silence each other by reporting.
  UPDATE public.channel_messages SET report_count = reporters,
    moderation_status = CASE WHEN reporters >= 1 AND coalesce(moderation_status,'approved') IN ('approved','') THEN 'flagged' ELSE moderation_status END
  WHERE id = NEW.message_id;
  RETURN NEW;
END $function$;

-- Previously auto-hidden posts go back to visible-but-flagged for staff review.
UPDATE public.channel_messages SET moderation_status = 'flagged' WHERE moderation_status = 'held';