CREATE TABLE IF NOT EXISTS public.tryout_evaluations (
 id text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text,'-',''),
 created_date timestamptz NOT NULL DEFAULT now(), updated_date timestamptz NOT NULL DEFAULT now(),
 created_by text, created_by_id text, is_sample boolean DEFAULT false,
 club_id text NOT NULL, tryout_plan_id text, tryout_event_id text NOT NULL, season_name text,
 player_id text, player_name text NOT NULL, player_bib numeric, player_photo_url text, player_age numeric,
 age_group text, player_gender text, guardian_email text,
 evaluator_user_id text, evaluator_email text NOT NULL, evaluator_name text,
 criteria_scores jsonb NOT NULL DEFAULT '{}'::jsonb, overall_grade numeric,
 recommendation text NOT NULL DEFAULT '', notes text, status text NOT NULL DEFAULT 'submitted', saved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tryout_evaluations TO authenticated;
GRANT ALL ON public.tryout_evaluations TO service_role;
ALTER TABLE public.tryout_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON public.tryout_evaluations FOR SELECT TO authenticated USING (public.is_club_manager(club_id) OR evaluator_user_id = auth.uid()::text);
CREATE POLICY staff_create ON public.tryout_evaluations FOR INSERT TO authenticated WITH CHECK (public.can_review_club_players(club_id) AND (evaluator_user_id = auth.uid()::text OR public.is_club_manager(club_id)));
CREATE POLICY staff_update ON public.tryout_evaluations FOR UPDATE TO authenticated USING (public.is_club_manager(club_id) OR evaluator_user_id = auth.uid()::text) WITH CHECK (public.can_review_club_players(club_id));
CREATE POLICY staff_delete ON public.tryout_evaluations FOR DELETE TO authenticated USING (public.is_club_manager(club_id) OR evaluator_user_id = auth.uid()::text);
CREATE POLICY core_required ON public.tryout_evaluations AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_has_console_module(club_id,'club_nexus')) WITH CHECK (public.tenant_has_console_module(club_id,'club_nexus'));
CREATE INDEX IF NOT EXISTS tryout_evaluations_event ON public.tryout_evaluations(club_id, tryout_event_id);
CREATE INDEX IF NOT EXISTS tryout_evaluations_plan ON public.tryout_evaluations(club_id, tryout_plan_id);

ALTER TABLE public.tryout_registrations ADD COLUMN IF NOT EXISTS placed_team_id text, ADD COLUMN IF NOT EXISTS placed_team_name text;

-- Eclipse 2010 ECNL parents
INSERT INTO public.guardians(id,club_id,first_name,last_name,email,phone,relationship,player_ids,is_sample)
SELECT 'es-g-'||p.id,p.club_id,(ARRAY['Jennifer','Michael','Sarah','David','Laura','Chris','Amanda','Brian'])[1+(row_number() over (order by p.id))::int%8],p.last_name,
 lower(p.first_name||'.'||p.last_name||'.parent@example.invalid'),'(630) 555-0'||lpad((100+row_number() over (order by p.id))::text,3,'0'),'Parent',jsonb_build_array(p.id),true
FROM public.players p WHERE p.club_id='eclipse-select' AND p.team_id='es-t1'
ON CONFLICT(id) DO NOTHING;
UPDATE public.players p SET guardian_id=g.id, guardian_ids=jsonb_build_array(g.id), guardian_name=g.first_name||' '||g.last_name
FROM public.guardians g WHERE g.id='es-g-'||p.id AND p.club_id='eclipse-select' AND p.team_id='es-t1';
UPDATE public.tryout_registrations r SET guardian_name=g.first_name||' '||g.last_name, guardian_email=g.email, guardian_phone=g.phone
FROM public.guardians g WHERE g.id='es-g-'||r.player_id AND r.club_id='eclipse-select';

-- Benchmarks (scored as % of club targets)
INSERT INTO public.test_benchmarks(id,club_id,category,test_key,test_label,gender,unit,direction,coefficient,p20,p40,p60,p80,p100,is_sample) VALUES
('es-bm-speed','eclipse-select','physical','speed','20-Meter Sprint','all','seconds','lower_better',1,3.9,3.7,3.5,3.3,3.1,true),
('es-bm-power','eclipse-select','physical','power','Vertical Jump','all','inches','higher_better',1,10,13,16,19,23,true),
('es-bm-agility','eclipse-select','physical','agility','5-10-5 Agility','all','seconds','lower_better',1,5.6,5.3,5.0,4.7,4.4,true),
('es-bm-endurance','eclipse-select','physical','endurance','Yo-Yo Intermittent Recovery','all','levels','higher_better',1,10,13,16,19,22,true),
('es-bm-sk1','eclipse-select','skill','es-sk1','30m Sprint','all','seconds','lower_better',1,5.2,4.9,4.6,4.4,4.2,true),
('es-bm-sk2','eclipse-select','skill','es-sk2','Yo-Yo IR1','all','levels','higher_better',1,12,14,16,18,20,true),
('es-bm-sk3','eclipse-select','skill','es-sk3','Juggling (max)','all','touches','higher_better',1,20,50,90,140,200,true)
ON CONFLICT(id) DO NOTHING;

-- Retention reviews for 2027-28
INSERT INTO public.player_season_reviews(club_id,player_id,season,intent,team_role)
SELECT p.club_id,p.id,'2027-28',
 CASE WHEN n IN (4,11) THEN 'at_risk' WHEN n=14 THEN 'leaving' ELSE 'returning' END,
 (ARRAY['indispensable','first_team_starter','first_team_starter','first_team_squad','second_team_starter','first_team_squad','second_team_squad','first_team_starter'])[1+(n%8)]
FROM (SELECT p.*, row_number() over (order by p.id)::int n FROM public.players p WHERE p.club_id='eclipse-select' AND p.team_id='es-t1') p
ON CONFLICT(club_id,player_id,season) DO NOTHING;
INSERT INTO public.player_coach_reviews(club_id,player_id,season,coach_user_id,recommendation,rationale)
SELECT r.club_id,r.player_id,r.season,'59d8b8b8-68d1-387a-bc90-8cedf0828571'::uuid,
 CASE WHEN r.intent='leaving' THEN 'move_out' WHEN r.team_role='indispensable' THEN 'move_up' WHEN r.team_role LIKE 'second%' THEN 'move_down' ELSE 'keep' END,
 'Demo end-of-season coach review.'
FROM public.player_season_reviews r WHERE r.club_id='eclipse-select' AND r.season='2027-28'
ON CONFLICT(club_id,player_id,season,coach_user_id) DO NOTHING;