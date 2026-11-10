
insert into public.programs (id, club_id, title, description, location_id, budget, status, is_sample)
select 'es-prog-'||t.id, 'eclipse-select', '2026-27 Season — '||t.name, 'Season dues program for '||t.name, t.location_id,
  case when t.id='es-t1' then 62000 when t.id='es-t6' then 18000 else 42000 end, 'active', true
from public.teams t where t.club_id='eclipse-select'
on conflict (id) do nothing;

insert into public.registrations (id, club_id, player_id, player_name, team_id, team_name, location_id, program_id, program_title,
  amount_due, amount_paid, payment_status, payment_frequency, next_payment_date, next_payment_amount, status, registration_date,
  waiver_accepted, paperwork_complete, is_sample, created_date)
select 'es-reg-'||p.id, 'eclipse-select', p.id, trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')), t.id, t.name, t.location_id,
  'es-prog-'||t.id, '2026-27 Season — '||t.name, due,
  case when rn % 6 = 0 then 0 when rn % 6 in (1,2) then round(due*0.5) else due end,
  case when rn % 6 = 0 then 'unpaid' when rn % 6 in (1,2) then 'partial' else 'paid' end,
  case when rn % 6 in (1,2) then 'monthly' else 'full' end,
  case when rn % 6 in (0,1,2) then (date '2026-11-03' + (rn % 5)*3)::text end,
  case when rn % 6 in (0,1,2) then round(due*0.25) end,
  'approved', (date '2026-08-01' + (rn % 30))::text, true, rn % 6 <> 0, true,
  case when rn % 6 = 0 then timestamptz '2026-08-20' when rn % 6 = 1 then timestamptz '2026-09-20' else timestamptz '2026-10-20' end
from (select p.*, (row_number() over (partition by p.team_id order by p.id))::int rn from public.players p where p.club_id='eclipse-select') p
join public.teams t on t.id=p.team_id
cross join lateral (select case when t.id='es-t1' then 3400 when t.id='es-t6' then 1200 else 2800 end::numeric due) d
on conflict (id) do nothing;

insert into public.expenses (id, club_id, program_id, category, description, amount, date, status, payment_status, assigned_to, is_sample)
select 'es-exp-'||x.k, 'eclipse-select', x.prog, x.cat, x.descr, x.amt, x.dt, x.st, x.ps, x.who, true
from (values
 ('t1-01','es-prog-es-t1','Travel','ECNL Showcase Phoenix — team flights',14200,'2026-10-10','approved','paid','Bookkeeper'),
 ('t1-02','es-prog-es-t1','Lodging','ECNL Showcase Phoenix — hotel block (18 rooms)',9600,'2026-10-12','approved','paid','Bookkeeper'),
 ('t1-03','es-prog-es-t1','League Fees','ECNL Girls 2026-27 league membership',6500,'2026-09-01','approved','paid','Club Director'),
 ('t1-04','es-prog-es-t1','Referees','ECNL Midwest conference referee fees (fall)',2400,'2026-10-25','approved','paid','Bookkeeper'),
 ('t1-05','es-prog-es-t1','Uniforms','Nike home/away kits & warmups (22 sets)',5280,'2026-08-15','approved','paid','Team Manager'),
 ('t1-06','es-prog-es-t1','Coaching','Head coach stipend — November',3200,'2026-11-03','approved','to_be_paid','Bookkeeper'),
 ('t1-07','es-prog-es-t1','Coaching','Assistant & GK coach stipend — November',1800,'2026-11-06','approved','to_be_paid','Bookkeeper'),
 ('t1-08','es-prog-es-t1','Facilities','Indoor winter turf rental — Dec block',4200,'2026-11-08','pending','to_be_paid','Facility Manager'),
 ('t1-09','es-prog-es-t1','Travel','ECNL Florida Showcase — bus charter deposit',2750,'2026-11-01','approved','to_be_paid','Bookkeeper'),
 ('t1-10','es-prog-es-t1','Equipment','Training balls, cones, GPS vests',1350,'2026-11-04','pending','to_be_paid','Head Coach'),
 ('t1-11','es-prog-es-t1','Medical','Athletic trainer coverage — fall',1600,'2026-10-28','pending','to_be_paid','Club Director'),
 ('t1-12','es-prog-es-t1','Recruiting','College ID camp registrations',900,'2026-10-20','approved','paid','Head Coach'),
 ('t2-01','es-prog-es-t2','Travel','ECNL Boys showcase — hotel',7200,'2026-10-14','approved','paid','Bookkeeper'),
 ('t2-02','es-prog-es-t2','League Fees','ECNL Boys league membership',6500,'2026-09-01','approved','paid','Club Director'),
 ('t2-03','es-prog-es-t2','Coaching','Head coach stipend — November',3000,'2026-11-03','approved','to_be_paid','Bookkeeper'),
 ('t2-04','es-prog-es-t2','Referees','Fall referee fees',2100,'2026-10-30','approved','to_be_paid','Bookkeeper'),
 ('t3-01','es-prog-es-t3','League Fees','ECNL-RL league membership',3800,'2026-09-01','approved','paid','Club Director'),
 ('t3-02','es-prog-es-t3','Uniforms','Kits & warmups',4600,'2026-08-18','approved','paid','Team Manager'),
 ('t3-03','es-prog-es-t3','Facilities','Field rental — Oakbrook',2600,'2026-11-10','pending','to_be_paid','Facility Manager'),
 ('t4-01','es-prog-es-t4','Travel','RL regional tournament travel',3900,'2026-10-05','approved','paid','Bookkeeper'),
 ('t4-02','es-prog-es-t4','Coaching','Head coach stipend — November',2600,'2026-11-05','approved','to_be_paid','Bookkeeper'),
 ('t5-01','es-prog-es-t5','Tournaments','Pre-ECNL Fall Classic entry',1450,'2026-10-22','approved','paid','Team Manager'),
 ('t5-02','es-prog-es-t5','Equipment','Pinnies, balls, goals',980,'2026-11-02','pending','to_be_paid','Head Coach'),
 ('t6-01','es-prog-es-t6','Coaching','Rising Stars coach stipends',1800,'2026-11-07','approved','to_be_paid','Bookkeeper'),
 ('t6-02','es-prog-es-t6','Uniforms','Rising Stars jerseys',1150,'2026-09-05','approved','paid','Team Manager'),
 ('club-01',null,'Insurance','US Youth Soccer club insurance (annual)',8400,'2026-08-01','approved','paid','Club Director'),
 ('club-02',null,'Software','Club Rudder OS subscription',2400,'2026-09-01','approved','paid','Club Admin'),
 ('club-03',null,'Facilities','Itasca complex lights & maintenance',3100,'2026-10-31','approved','to_be_paid','Facility Manager'),
 ('club-04',null,'Marketing','Spring tryout campaign ads',1200,'2026-11-12','pending','to_be_paid','Club Admin')
) as x(k, prog, cat, descr, amt, dt, st, ps, who)
on conflict (id) do nothing;

insert into public.staff_pays (id, club_id, program_id, staff_name, staff_email, role, date, hours_worked, amount, payment_status, payor_name, notes, is_sample)
select 'es-pay-'||x.k, 'eclipse-select', x.prog, x.n, x.e, x.r, x.dt, x.h, x.amt, x.ps, 'Eclipse Select SC', x.note, true
from (values
 ('1','es-prog-es-t1','Megan Doyle','megan.doyle@eclipse-demo.org','Head Coach','2026-10-31',64,3200,'paid','October stipend — 2010 Girls ECNL'),
 ('2','es-prog-es-t1','Carlos Rivera','carlos.rivera@eclipse-demo.org','Assistant Coach','2026-10-31',40,1200,'paid','October — 2010 Girls ECNL'),
 ('3','es-prog-es-t1','Jenna Park','jenna.park@eclipse-demo.org','GK Coach','2026-10-31',20,600,'paid','October GK sessions'),
 ('4','es-prog-es-t1','Megan Doyle','megan.doyle@eclipse-demo.org','Head Coach','2026-11-30',64,3200,'to_be_paid','November stipend — 2010 Girls ECNL'),
 ('5','es-prog-es-t2','Tom Becker','tom.becker@eclipse-demo.org','Head Coach','2026-10-31',60,3000,'paid','October — 2011 Boys ECNL'),
 ('6','es-prog-es-t3','Alicia Grant','alicia.grant@eclipse-demo.org','Head Coach','2026-10-31',52,2600,'paid','October — 2012 Girls RL')
) as x(k, prog, n, e, r, dt, h, amt, ps, note)
on conflict (id) do nothing;
