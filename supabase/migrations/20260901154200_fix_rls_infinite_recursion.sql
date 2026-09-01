-- Migration: 20260901154200_fix_rls_infinite_recursion.sql
-- Fixes PostgreSQL Error 42P17: infinite recursion detected in policy for relation "profiles"

-- 1. Create SECURITY DEFINER helper functions
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Fix Profiles Policy
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
CREATE POLICY "Profiles view policy" ON public.profiles
FOR ALL USING (
    id = auth.uid() OR
    get_my_role() = 'admin' OR
    (organization_id IS NOT NULL AND organization_id = get_my_org_id())
);

-- 3. Fix Organizations Policy
DROP POLICY IF EXISTS "Organizations view policy" ON public.organizations;
CREATE POLICY "Organizations view policy" ON public.organizations
FOR ALL USING (
    get_my_role() = 'admin' OR
    id = get_my_org_id()
);

-- 4. Fix Meetings Policy
DROP POLICY IF EXISTS "Meetings view policy" ON public.meetings;
CREATE POLICY "Meetings view policy" ON public.meetings
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    organization_id = get_my_org_id()
);

-- 5. Fix Minutes Policy
DROP POLICY IF EXISTS "Minutes view policy" ON public.minutes;
CREATE POLICY "Minutes view policy" ON public.minutes
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    (status = 'published' AND meeting_id IN (SELECT id FROM public.meetings WHERE organization_id = get_my_org_id()))
);

-- 6. Fix Commitments Policy
DROP POLICY IF EXISTS "Commitments view policy" ON public.commitments;
CREATE POLICY "Commitments view policy" ON public.commitments
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    organization_id = get_my_org_id()
);

-- 7. Fix Audios & Transcriptions Policies
DROP POLICY IF EXISTS "Audios view policy" ON public.audios;
CREATE POLICY "Audios view policy" ON public.audios
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    meeting_id IN (SELECT id FROM public.meetings WHERE organization_id = get_my_org_id())
);

DROP POLICY IF EXISTS "Transcriptions view policy" ON public.transcriptions;
CREATE POLICY "Transcriptions view policy" ON public.transcriptions
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    audio_id IN (SELECT id FROM public.audios WHERE meeting_id IN (SELECT id FROM public.meetings WHERE organization_id = get_my_org_id()))
);

-- 8. Fix Diagnostic, Master Plan, Pentagon, Risk Policies
DROP POLICY IF EXISTS "diagnostic_360 view policy" ON public.diagnostic_360;
CREATE POLICY "diagnostic_360 view policy" ON public.diagnostic_360
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    (status = 'published' AND organization_id = get_my_org_id())
);

DROP POLICY IF EXISTS "diagnostic_suggestions view policy" ON public.diagnostic_suggestions;
CREATE POLICY "diagnostic_suggestions view policy" ON public.diagnostic_suggestions
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant')
);

DROP POLICY IF EXISTS "master_plan_tasks view policy" ON public.master_plan_tasks;
CREATE POLICY "master_plan_tasks view policy" ON public.master_plan_tasks
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    organization_id = get_my_org_id()
);

DROP POLICY IF EXISTS "pentagon_scores view policy" ON public.pentagon_scores;
CREATE POLICY "pentagon_scores view policy" ON public.pentagon_scores
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    organization_id = get_my_org_id()
);

DROP POLICY IF EXISTS "risk_matrix view policy" ON public.risk_matrix;
CREATE POLICY "risk_matrix view policy" ON public.risk_matrix
FOR ALL USING (
    get_my_role() IN ('admin', 'consultant') OR
    organization_id = get_my_org_id()
);
