WITH picked AS (
  SELECT id, row_number() OVER (ORDER BY days_overdue DESC, player_name) AS n
  FROM public.payment_resolutions WHERE club_id = 'eclipse-select' AND status = 'open'
)
UPDATE public.payment_resolutions r SET
  status = 'in_progress',
  assigned_to = 'bookkeeper@eclipseselect.org',
  assigned_name = 'Dana Whitfield (Bookkeeper)',
  contact_attempts = CASE WHEN p.n % 3 = 0 THEN 1 ELSE 2 END,
  reminder_count = 1,
  last_reminder_at = to_char(now() - interval '6 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  last_contacted_at = to_char(now() - interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  last_contact_channel = CASE WHEN p.n % 2 = 0 THEN 'call' ELSE 'email' END,
  next_follow_up = to_char(current_date + (CASE WHEN p.n % 4 = 0 THEN -1 ELSE (p.n % 5)::int END), 'YYYY-MM-DD'),
  timeline = r.timeline || jsonb_build_array(
    jsonb_build_object('at', to_char(now() - interval '6 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'by', 'Dana Whitfield', 'action', 'reminder_sent', 'note', 'Reminder emailed to the family.'),
    jsonb_build_object('at', to_char(now() - interval '2 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'by', 'Dana Whitfield', 'action', 'contact_logged',
      'note', CASE WHEN p.n % 2 = 0 THEN 'Phone call: parent will pay after next paycheck, asked about splitting the balance.' ELSE 'Email: card on file expired — family updating it this week.' END)
  )
FROM picked p
WHERE r.id = p.id AND p.n <= 12;