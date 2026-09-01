-- Migration: fase2_automation.sql
-- Implements: Diagnóstico 360, Master Plan Estratégico, Pentágono del Orden y Matriz de Riesgos

-- 1. Diagnóstico 360°
CREATE TABLE IF NOT EXISTS diagnostic_360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    omv_target JSONB DEFAULT '{
        "vision_3_years": "",
        "target_kpis": {
            "facturacion_anual": "",
            "margen_neto": "",
            "dotacion_total": "",
            "proyectos_simultaneos": "",
            "mix_mercados": "",
            "capacidad_objetivo": "",
            "rol_titular": "",
            "ventaja_competitiva": ""
        }
    }'::jsonb,
    areas_data JSONB DEFAULT '{
        "area_1_direccion": {"name": "Dirección y Estrategia", "questions": {}, "kpis": {}},
        "area_2_finanzas": {"name": "Administración y Finanzas", "questions": {}, "kpis": {}},
        "area_3_operaciones": {"name": "Operaciones y Producción", "questions": {}, "kpis": {}},
        "area_4_rrhh": {"name": "Recursos Humanos", "questions": {}, "kpis": {}},
        "area_5_comercial": {"name": "Comercial y Marketing", "questions": {}, "kpis": {}},
        "area_6_clientes": {"name": "Clientes y Experiencia", "questions": {}, "kpis": {}},
        "area_7_procesos": {"name": "Procesos y Sistemas de Gestión", "questions": {}, "kpis": {}},
        "area_8_tecnologia": {"name": "Tecnología e Innovación", "questions": {}, "kpis": {}},
        "area_9_gobernanza": {"name": "Gobernanza y Directorio", "questions": {}, "kpis": {}},
        "area_10_riesgo": {"name": "Continuidad y Riesgo", "questions": {}, "kpis": {}}
    }'::jsonb,
    ime_score NUMERIC(4,2) DEFAULT 0.00, -- Índice de Madurez Estratégica 0-100
    ire_score NUMERIC(4,2) DEFAULT 0.00, -- Índice de Riesgo Empresario 0-100
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sugerencias de actualización incremental por IA (PR-02)
CREATE TABLE IF NOT EXISTS diagnostic_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    suggested_changes JSONB NOT NULL, -- { question_id: { old_value, new_value, reason, kpi_updates } }
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'partially_accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. Master Plan Estratégico (MPE / Poda)
CREATE TABLE IF NOT EXISTS master_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    axis INTEGER NOT NULL CHECK (axis BETWEEN 1 AND 5), -- 1: Gobernanza, 2: Procesos, 3: Finanzas, 4: Talento, 5: Comercial
    parent_task_id UUID REFERENCES master_plan_tasks(id) ON DELETE CASCADE,
    code TEXT, -- e.g. "1.1", "2.3.1"
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Media' CHECK (priority IN ('Alta', 'Media', 'Baja')),
    start_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'sin_iniciar' CHECK (status IN ('sin_iniciar', 'en_proceso', 'finalizado', 'bloqueado')),
    assigned_role TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    checklists JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pentágono del Orden (PENT-PE / Historial de Madurez)
CREATE TABLE IF NOT EXISTS pentagon_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_label TEXT NOT NULL, -- e.g. "Línea Base Ago 2026", "Nov 2026 (+3m)", "Meta Dic 2029"
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gobernanza NUMERIC(4,2) DEFAULT 0.00 CHECK (gobernanza BETWEEN 0 AND 10),
    procesos NUMERIC(4,2) DEFAULT 0.00 CHECK (procesos BETWEEN 0 AND 10),
    finanzas NUMERIC(4,2) DEFAULT 0.00 CHECK (finanzas BETWEEN 0 AND 10),
    talento NUMERIC(4,2) DEFAULT 0.00 CHECK (talento BETWEEN 0 AND 10),
    comercial NUMERIC(4,2) DEFAULT 0.00 CHECK (comercial BETWEEN 0 AND 10),
    ime_actual NUMERIC(4,2) DEFAULT 0.00 CHECK (ime_actual BETWEEN 0 AND 10),
    is_baseline BOOLEAN DEFAULT false,
    is_meta BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matriz de Riesgos Organizacionales
CREATE TABLE IF NOT EXISTS risk_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. "R-01"
    category TEXT NOT NULL, -- e.g. "A. Estratégico / Gobierno", "B. Comercial / Mercado", etc.
    risk_name TEXT NOT NULL,
    cause TEXT,
    consequence TEXT,
    prob_inherent INTEGER NOT NULL CHECK (prob_inherent BETWEEN 1 AND 5),
    imp_inherent INTEGER NOT NULL CHECK (imp_inherent BETWEEN 1 AND 5),
    level_inherent INTEGER GENERATED ALWAYS AS (prob_inherent * imp_inherent) STORED,
    strategy TEXT DEFAULT 'Mitigar' CHECK (strategy IN ('Mitigar', 'Evitar', 'Transferir', 'Aceptar')),
    mitigation_actions TEXT,
    responsible_role TEXT,
    prob_residual INTEGER CHECK (prob_residual BETWEEN 1 AND 5),
    imp_residual INTEGER CHECK (imp_residual BETWEEN 1 AND 5),
    level_residual INTEGER GENERATED ALWAYS AS (prob_residual * imp_residual) STORED,
    early_warning_kpi TEXT,
    linked_master_plan_task_id UUID REFERENCES master_plan_tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE diagnostic_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pentagon_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "diagnostic_360 view policy" ON diagnostic_360
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'consultant') OR
    (status = 'published' AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "diagnostic_suggestions view policy" ON diagnostic_suggestions
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'consultant')
);

CREATE POLICY "master_plan_tasks view policy" ON master_plan_tasks
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "pentagon_scores view policy" ON pentagon_scores
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "risk_matrix view policy" ON risk_matrix
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Triggers for modtime
CREATE TRIGGER update_diagnostic_360_modtime BEFORE UPDATE ON diagnostic_360 FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_master_plan_tasks_modtime BEFORE UPDATE ON master_plan_tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pentagon_scores_modtime BEFORE UPDATE ON pentagon_scores FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_risk_matrix_modtime BEFORE UPDATE ON risk_matrix FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
