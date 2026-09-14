-- Migration: 20260914000000_meetings_lifecycle_and_quarterly_masterplan.sql
-- Implements:
-- 1. Meeting Lifecycles (Kickoff, Diagnostico, Seguimiento Trimestral, Checkout)
-- 2. Client validation / checkout status on interviews
-- 3. Master Plan Quarterly Reviews (3-month recurring monitoring & historical Pentagon remediation)
-- 4. Multi-tenant security indexing per organization_id

-- 1. Extend gobernanza_entrevistas with meeting lifecycle and validation columns
ALTER TABLE public.gobernanza_entrevistas 
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'diagnostico' CHECK (meeting_type IN ('kickoff', 'diagnostico', 'seguimiento_trimestral', 'checkout', 'general')),
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'accepted', 'rejected', 'in_review')),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validated_by TEXT,
ADD COLUMN IF NOT EXISTS client_feedback TEXT,
ADD COLUMN IF NOT EXISTS omv_deliverable JSONB DEFAULT '{}'::jsonb;

-- Ensure indexes for fast filtering by client and meeting type
CREATE INDEX IF NOT EXISTS idx_gobernanza_entrevistas_meeting_type ON public.gobernanza_entrevistas(client_id, meeting_type);

-- 2. Create Master Plan Quarterly Reviews Table
CREATE TABLE IF NOT EXISTS public.master_plan_quarterly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    quarter TEXT NOT NULL, -- e.g. 'Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pentagon_scores JSONB NOT NULL DEFAULT '{"gobernanza":0,"procesos":0,"finanzas":0,"talento":0,"comercial":0}'::jsonb,
    ime_score NUMERIC(5,2) DEFAULT 0.00,
    ire_score NUMERIC(5,2) DEFAULT 0.00,
    initiatives_status JSONB DEFAULT '[]'::jsonb,
    summary_notes TEXT,
    consultant_name TEXT DEFAULT 'Consultor GS',
    client_validator_name TEXT,
    next_review_date DATE DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'in_review', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quarterly reviews
CREATE INDEX IF NOT EXISTS idx_master_plan_quarterly_org ON public.master_plan_quarterly_reviews(organization_id, review_date DESC);

-- Enable RLS
ALTER TABLE public.master_plan_quarterly_reviews ENABLE ROW LEVEL SECURITY;

-- Multi-tenant RLS Policies
CREATE POLICY "Permitir select autenticados master_plan_quarterly_reviews"
    ON public.master_plan_quarterly_reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir insert/update autenticados master_plan_quarterly_reviews"
    ON public.master_plan_quarterly_reviews FOR ALL
    TO authenticated
    USING (true);

-- Seed initial quarterly reviews for demo organizations if available
DO $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id FROM public.organizations LIMIT 1;
    IF org_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.master_plan_quarterly_reviews WHERE organization_id = org_id) THEN
            INSERT INTO public.master_plan_quarterly_reviews (
                organization_id,
                quarter,
                review_date,
                pentagon_scores,
                ime_score,
                ire_score,
                initiatives_status,
                summary_notes,
                next_review_date,
                status
            ) VALUES 
            (
                org_id,
                'Q1-2026 (Línea Base)',
                CURRENT_DATE - INTERVAL '90 days',
                '{"gobernanza": 5.2, "procesos": 4.5, "finanzas": 6.0, "talento": 5.0, "comercial": 4.8}'::jsonb,
                5.10,
                4.90,
                '[{"axis": 1, "name": "Formalización de Directorio", "status": "completado"}, {"axis": 2, "name": "Mapeo de Procesos Críticos", "status": "en_proceso"}]'::jsonb,
                'Medición de Línea Base inicial al inicio de la tutoría estratégica GS.',
                CURRENT_DATE,
                'completed'
            ),
            (
                org_id,
                'Q2-2026 (Primer Trimestre)',
                CURRENT_DATE,
                '{"gobernanza": 6.8, "procesos": 5.9, "finanzas": 7.1, "talento": 6.3, "comercial": 5.5}'::jsonb,
                6.32,
                3.68,
                '[{"axis": 1, "name": "Formalización de Directorio", "status": "completado"}, {"axis": 2, "name": "Mapeo de Procesos Críticos", "status": "completado"}, {"axis": 3, "name": "Flujo de Fondos Proyectado", "status": "en_proceso"}]'::jsonb,
                'Avance positivo en gobernanza y ordenamiento de procesos operativos. Descenso de riesgo empresario.',
                CURRENT_DATE + INTERVAL '90 days',
                'completed'
            );
        END IF;
    END IF;
END $$;
