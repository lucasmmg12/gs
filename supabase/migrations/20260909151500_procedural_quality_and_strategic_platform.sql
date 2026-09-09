-- Migration: 20260909151500_procedural_quality_and_strategic_platform.sql
-- Implements complete procedural standards from:
-- 1. Procedimiento de Requerimientos_Formulariod e diagnostico (2).docx
-- 2. Procedimiento_Plataforma_Integral_Tutoria_GrowLabs_REV0 (1).docx

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. EXTENSIONS TO EXISTING TABLES
-- ============================================================================

-- A. Organizations (Client portal details)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portal_access_code TEXT DEFAULT 'GS-DEMO-2026';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS client_lead_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS client_lead_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portal_active BOOLEAN DEFAULT true;

-- B. Diagnostic 360 (Quality approvals & traceability)
ALTER TABLE diagnostic_360 ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE diagnostic_360 ADD COLUMN IF NOT EXISTS quality_approved_at TIMESTAMPTZ;
ALTER TABLE diagnostic_360 ADD COLUMN IF NOT EXISTS quality_approver_name TEXT;
ALTER TABLE diagnostic_360 ADD COLUMN IF NOT EXISTS quality_comments TEXT;

-- C. Minutes (Quality approvals & traceability)
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending' CHECK (quality_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS quality_approved_at TIMESTAMPTZ;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS quality_approver_name TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS quality_comments TEXT;

-- ============================================================================
-- 2. QUALITY APPROVALS & MULTI-CONSULTANT TRACEABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('minute', 'diagnostic_360', 'master_plan', 'omv', 'risk_matrix')),
    entity_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    consultant_name TEXT NOT NULL,
    consultant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    quality_score NUMERIC(4,2) DEFAULT 10.00,
    comments TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. OMV MODULE (OBJETIVO DE MÁXIMA VISIÓN A 3 AÑOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS omv_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vision_3_years TEXT NOT NULL,
    podcast_audio_url TEXT,
    podcast_duration_seconds INTEGER,
    written_minute TEXT,
    roadmap_stages JSONB DEFAULT '[]'::jsonb,
    kpi_targets JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. STRATEGIC MATRICES (FODA, TOWS, PESTEL, PORTER, RISK MATRIX)
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategic_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    diagnostic_id UUID REFERENCES diagnostic_360(id) ON DELETE CASCADE,
    foda_data JSONB DEFAULT '{"fortalezas":[],"debilidades":[],"oportunidades":[],"amenazas":[]}'::jsonb,
    tows_data JSONB DEFAULT '{"fo":[],"fa":[],"do":[],"da":[]}'::jsonb,
    pestel_data JSONB DEFAULT '{"politico":[],"economico":[],"social":[],"tecnologico":[],"ecologico":[],"legal":[]}'::jsonb,
    porter_data JSONB DEFAULT '{"rivalry":"","entry_barriers":"","substitutes":"","buyer_power":"","supplier_power":""}'::jsonb,
    risk_matrix_summary JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. DIAGNOSTIC RESPONSES (CLOSED-QUESTION DETERMINISTIC BANK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS diagnostic_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    diagnostic_id UUID REFERENCES diagnostic_360(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    pentagon_calculated JSONB DEFAULT '{"gobernanza":0,"procesos":0,"finanzas":0,"talento":0,"comercial":0}'::jsonb,
    subaxis_scores JSONB DEFAULT '{}'::jsonb,
    ime_score NUMERIC(5,2) DEFAULT 0.00,
    ire_score NUMERIC(5,2) DEFAULT 0.00,
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'verified')),
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. CLIENT PORTAL ACTIVITIES & AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_portal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'view_deliverable', 'download_pdf', 'download_excel', 'ai_generate_content', 'feedback_submitted')),
    details JSONB DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE quality_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE omv_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and manage these records
CREATE POLICY "Quality approvals access policy" ON quality_approvals
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "OMV modules access policy" ON omv_modules
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Strategic matrices access policy" ON strategic_matrices
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Diagnostic responses access policy" ON diagnostic_responses
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Client portal activities access policy" ON client_portal_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 8. INITIAL SEED DATA FOR DEMO CLIENT (EJEMPLO SAS)
-- ============================================================================

DO $$
DECLARE
    org_id UUID;
    diag_id UUID;
    min_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations LIMIT 1;
    SELECT id INTO diag_id FROM diagnostic_360 WHERE organization_id = org_id LIMIT 1;
    SELECT id INTO min_id FROM minutes LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- Seed OMV Module if not present
        IF NOT EXISTS (SELECT 1 FROM omv_modules WHERE organization_id = org_id) THEN
            INSERT INTO omv_modules (
                organization_id,
                vision_3_years,
                written_minute,
                podcast_duration_seconds,
                roadmap_stages,
                status
            ) VALUES (
                org_id,
                'En 2029, EJEMPLO SAS opera como la empresa líder de desarrollo e ingeniería con procesos estandarizados ISO 9001, facturación de USD 1.8M anuales y un directorio profesionalizado con gobernanza independiente.',
                'Minuta Oficial de Visión Estratégica: Los socios fundadores acordaron la hoja de ruta hacia 2029, desvinculando la operación diaria de la dirección estratégica.',
                380,
                '[
                    {"etapa": "Semestre 1 (2026)", "hito": "Consolidación de Procesos Críticos y Pentágono Base", "responsable": "Dirección General", "estado": "completado"},
                    {"etapa": "Semestre 2 (2027)", "hito": "Automatización Operativa e Implementación ERP", "responsable": "Gerencia Operativa", "estado": "en_proceso"},
                    {"etapa": "Semestre 3 (2028)", "hito": "Expansión Regional y Delegación de Roles Clave", "responsable": "Comercial & Finanzas", "estado": "pendiente"},
                    {"etapa": "Semestre 4 (2029)", "hito": "Gobernanza Plena y Franquiciamiento / Escalamiento", "responsable": "Directorio", "estado": "pendiente"}
                ]'::jsonb,
                'approved'
            );
        END IF;

        -- Seed Strategic Matrices if not present
        IF NOT EXISTS (SELECT 1 FROM strategic_matrices WHERE organization_id = org_id) THEN
            INSERT INTO strategic_matrices (
                organization_id,
                diagnostic_id,
                foda_data,
                tows_data,
                pestel_data,
                porter_data,
                status
            ) VALUES (
                org_id,
                diag_id,
                '{
                    "fortalezas": ["Equipo técnico altamente especializado", "Excelente reputación en el mercado local", "Metodología ágil probada"],
                    "debilidades": ["Concentración de clientes (3 clientes representan el 65% del ingreso)", "Falta de manuales de puestos formales", "Proceso de ventas no sistematizado"],
                    "oportunidades": ["Alta demanda de digitalización corporativa", "Apertura de licitaciones públicas de software", "Integración con partners internacionales"],
                    "amenazas": ["Inflación y volatilidad de costos operativos", "Fuga de talentos hacia empresas extranjeras", "Entrada de competidores de bajo costo"]
                }'::jsonb,
                '{
                    "fo": ["Aprovechar prestigio técnico para capturar licitaciones de gran porte", "Capacitar equipo para certificaciones internacionales"],
                    "fa": ["Desarrollar productos con pricing en moneda dura para mitigar inflación", "Planes de retención de talento con stock options"],
                    "do": ["Sistematizar ventas para diversificar clientes mediante CRM", "Formalizar organigrama para captar cuentas medianas"],
                    "da": ["Revisar contratos y cláusulas de indexación", "Reducir dependencia operativa de fundadores"]
                }'::jsonb,
                '{
                    "politico": ["Regulación laboral y cargas sociales crecientes", "Incentivos fiscales a la economía del conocimiento"],
                    "economico": ["Volatilidad cambiaria y acceso al crédito", "Aumento de costos salariales en tecnología"],
                    "social": ["Preferencia por trabajo remoto e híbrido", "Búsqueda de balance vida-trabajo en jóvenes profesionales"],
                    "tecnologico": ["Adopción acelerada de IA y automatización", "Cloud computing como estándar obligatorio"],
                    "ecologico": ["Exigencia de huella de carbono neutra", "Eficiencia energética en infraestructura de datos"],
                    "legal": ["Protección de datos personales (GDPR local)", "Propiedad intelectual de software registrado"]
                }'::jsonb,
                '{
                    "rivalry": "Media - Alta",
                    "entry_barriers": "Medias (requiere know-how específico y certificaciones)",
                    "substitutes": "Baja - Soluciones customizadas difíciles de reemplazar con software genérico",
                    "buyer_power": "Alta - 3 clientes concentran poder de negociación",
                    "supplier_power": "Media - Servicios cloud concentrados en AWS y Google"
                }'::jsonb,
                'approved'
            );
        END IF;

        -- Seed Quality Approvals if not present
        IF NOT EXISTS (SELECT 1 FROM quality_approvals WHERE organization_id = org_id) THEN
            INSERT INTO quality_approvals (
                organization_id,
                entity_type,
                entity_id,
                version,
                approval_status,
                consultant_name,
                quality_score,
                comments
            ) VALUES (
                org_id,
                'diagnostic_360',
                COALESCE(diag_id, gen_random_uuid()),
                1,
                'approved',
                'Martín Gómez (Consultor Senior GS)',
                9.5,
                'Diagnóstico validado con los 10 ejes normativos, semáforo en verde y cálculo determinístico IME 5.5 / IRE 4.2.'
            );

            IF min_id IS NOT NULL THEN
                INSERT INTO quality_approvals (
                    organization_id,
                    entity_type,
                    entity_id,
                    version,
                    approval_status,
                    consultant_name,
                    quality_score,
                    comments
                ) VALUES (
                    org_id,
                    'minute',
                    min_id,
                    1,
                    'approved',
                    'Lucía Fernández (Auditora de Procesos GS)',
                    10.0,
                    'Minuta oficial revisada conforme a PR-01 con compromisos y fechas verificadas.'
                );
            END IF;
        END IF;
    END IF;
END $$;
