CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: athletes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athletes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    name text NOT NULL,
    goal text,
    refs jsonb DEFAULT '{}'::jsonb,
    vo2max numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active_snapshot_id uuid
);


--
-- Name: checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    date_iso date DEFAULT CURRENT_DATE NOT NULL,
    week_tag text,
    sleep integer,
    fatigue integer,
    soreness integer,
    stress integer,
    motivation integer,
    rpe_key1 integer,
    rpe_key2 integer,
    pain_flag boolean DEFAULT false,
    readiness integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT checkins_fatigue_check CHECK (((fatigue >= 1) AND (fatigue <= 10))),
    CONSTRAINT checkins_motivation_check CHECK (((motivation >= 1) AND (motivation <= 10))),
    CONSTRAINT checkins_rpe_key1_check CHECK (((rpe_key1 >= 1) AND (rpe_key1 <= 10))),
    CONSTRAINT checkins_rpe_key2_check CHECK (((rpe_key2 >= 1) AND (rpe_key2 <= 10))),
    CONSTRAINT checkins_sleep_check CHECK (((sleep >= 1) AND (sleep <= 10))),
    CONSTRAINT checkins_soreness_check CHECK (((soreness >= 1) AND (soreness <= 10))),
    CONSTRAINT checkins_stress_check CHECK (((stress >= 1) AND (stress <= 10)))
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    athlete_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    plan_json jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    cycle_tag text,
    confidence numeric(3,2),
    fc_max integer,
    vma numeric(4,2),
    ftp integer,
    css numeric(4,2),
    vo2max numeric(4,1),
    vlamax numeric(4,3),
    weight_kg numeric(5,2),
    fat_pct numeric(4,1),
    pmax_5s integer,
    metabolic_profile text,
    metabolic_score integer,
    coach_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tss_7d integer,
    tte_mode text,
    tte_observed_min integer,
    run_pace_ref_sec_per_km integer,
    run_hr_ref_bpm integer,
    run_duration_min integer,
    run_hr_drift_pct numeric,
    run_economy_score integer,
    run_economy_label text,
    sport_main text DEFAULT 'bike'::text,
    objectif text DEFAULT '703'::text,
    pace_threshold_sec_per_km integer,
    vlamax_source text,
    vlamax_protocol text,
    vlamax_is_reference boolean DEFAULT false,
    fatigue_state text DEFAULT 'ok'::text,
    bike_cadence_rpm integer,
    bike_hr_drift_flag boolean,
    carb_tolerance_band text,
    gi_issues_flag boolean DEFAULT false,
    CONSTRAINT snapshots_tss_7d_range CHECK (((tss_7d IS NULL) OR ((tss_7d >= 0) AND (tss_7d <= 3000)))),
    CONSTRAINT snapshots_tte_mode_allowed CHECK (((tte_mode IS NULL) OR (tte_mode = ANY (ARRAY['LOAD'::text, 'OBSERVED'::text])))),
    CONSTRAINT snapshots_tte_observed_range CHECK (((tte_observed_min IS NULL) OR ((tte_observed_min >= 10) AND (tte_observed_min <= 120))))
);


--
-- Name: tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    sport text,
    date timestamp with time zone DEFAULT now() NOT NULL,
    reliability numeric,
    vlamax numeric,
    raw jsonb DEFAULT '{}'::jsonb,
    note text
);


--
-- Name: athletes athletes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_pkey PRIMARY KEY (id);


--
-- Name: checkins checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (athlete_id);


--
-- Name: snapshots snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_pkey PRIMARY KEY (id);


--
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


--
-- Name: idx_athletes_active_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athletes_active_snapshot ON public.athletes USING btree (active_snapshot_id);


--
-- Name: idx_athletes_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athletes_coach_id ON public.athletes USING btree (coach_id);


--
-- Name: idx_checkins_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_athlete ON public.checkins USING btree (athlete_id);


--
-- Name: idx_checkins_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_date ON public.checkins USING btree (date_iso DESC);


--
-- Name: idx_plans_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_coach_id ON public.plans USING btree (coach_id);


--
-- Name: idx_snapshots_athlete; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_athlete ON public.snapshots USING btree (athlete_id);


--
-- Name: idx_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_date ON public.snapshots USING btree (date DESC);


--
-- Name: idx_tests_athlete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tests_athlete_id ON public.tests USING btree (athlete_id);


--
-- Name: idx_tests_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tests_coach_id ON public.tests USING btree (coach_id);


--
-- Name: checkins update_checkins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON public.checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: snapshots update_snapshots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_snapshots_updated_at BEFORE UPDATE ON public.snapshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: athletes athletes_active_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athletes
    ADD CONSTRAINT athletes_active_snapshot_id_fkey FOREIGN KEY (active_snapshot_id) REFERENCES public.snapshots(id) ON DELETE SET NULL;


--
-- Name: checkins checkins_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: plans plans_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: snapshots snapshots_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: tests tests_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;


--
-- Name: athletes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

--
-- Name: athletes athletes_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY athletes_delete_own ON public.athletes FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: athletes athletes_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY athletes_insert_own ON public.athletes FOR INSERT WITH CHECK ((coach_id = auth.uid()));


--
-- Name: athletes athletes_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY athletes_select_own ON public.athletes FOR SELECT USING ((coach_id = auth.uid()));


--
-- Name: athletes athletes_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY athletes_update_own ON public.athletes FOR UPDATE USING ((coach_id = auth.uid())) WITH CHECK ((coach_id = auth.uid()));


--
-- Name: checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: checkins checkins_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checkins_delete_own ON public.checkins FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: checkins checkins_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checkins_insert_own ON public.checkins FOR INSERT WITH CHECK ((coach_id = auth.uid()));


--
-- Name: checkins checkins_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checkins_select_own ON public.checkins FOR SELECT USING ((coach_id = auth.uid()));


--
-- Name: checkins checkins_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checkins_update_own ON public.checkins FOR UPDATE USING ((coach_id = auth.uid())) WITH CHECK ((coach_id = auth.uid()));


--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_delete_own ON public.plans FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: plans plans_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_insert_own ON public.plans FOR INSERT WITH CHECK ((coach_id = auth.uid()));


--
-- Name: plans plans_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_select_own ON public.plans FOR SELECT USING ((coach_id = auth.uid()));


--
-- Name: plans plans_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_update_own ON public.plans FOR UPDATE USING ((coach_id = auth.uid())) WITH CHECK ((coach_id = auth.uid()));


--
-- Name: snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: snapshots snapshots_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_delete_own ON public.snapshots FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: snapshots snapshots_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_insert_own ON public.snapshots FOR INSERT WITH CHECK ((coach_id = auth.uid()));


--
-- Name: snapshots snapshots_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_select_own ON public.snapshots FOR SELECT USING ((coach_id = auth.uid()));


--
-- Name: snapshots snapshots_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_update_own ON public.snapshots FOR UPDATE USING ((coach_id = auth.uid())) WITH CHECK ((coach_id = auth.uid()));


--
-- Name: tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

--
-- Name: tests tests_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tests_delete_own ON public.tests FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: tests tests_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tests_insert_own ON public.tests FOR INSERT WITH CHECK ((coach_id = auth.uid()));


--
-- Name: tests tests_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tests_select_own ON public.tests FOR SELECT USING ((coach_id = auth.uid()));


--
-- Name: tests tests_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tests_update_own ON public.tests FOR UPDATE USING ((coach_id = auth.uid())) WITH CHECK ((coach_id = auth.uid()));


--
-- PostgreSQL database dump complete
--




COMMIT;