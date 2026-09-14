-- Migration: Real-Time Audio Chunks, WebSocket Support, and Live Database Transcriptions
-- Supports real-time persistence of audio chunks, transcriptions, and Supabase Realtime broadcast

-- 1. Extend gobernanza_entrevistas with required columns
ALTER TABLE public.gobernanza_entrevistas 
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'diagnostico',
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS omv_deliverable JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcripcion_raw TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS live_status TEXT DEFAULT 'idle';

-- 2. Create gobernanza_audio_chunks for real-time chunk persistence
CREATE TABLE IF NOT EXISTS public.gobernanza_audio_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    client_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    storage_path TEXT,
    transcription TEXT DEFAULT '',
    duration_seconds NUMERIC DEFAULT 0,
    question_id TEXT,
    question_title TEXT,
    speaker TEXT DEFAULT 'Participante',
    is_final BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_session_chunk UNIQUE (session_id, chunk_index)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session ON public.gobernanza_audio_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_client ON public.gobernanza_audio_chunks(client_id);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_created ON public.gobernanza_audio_chunks(created_at);

-- RLS
ALTER TABLE public.gobernanza_audio_chunks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gobernanza_audio_chunks' AND policyname = 'Permitir select en chunks'
    ) THEN
        CREATE POLICY "Permitir select en chunks" 
        ON public.gobernanza_audio_chunks FOR SELECT 
        TO authenticated, anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gobernanza_audio_chunks' AND policyname = 'Permitir all en chunks'
    ) THEN
        CREATE POLICY "Permitir all en chunks" 
        ON public.gobernanza_audio_chunks FOR ALL 
        TO authenticated, anon USING (true);
    END IF;

    -- Entrevistas anon policies for portal/live sync
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gobernanza_entrevistas' AND policyname = 'Permitir select anon en entrevistas'
    ) THEN
        CREATE POLICY "Permitir select anon en entrevistas" 
        ON public.gobernanza_entrevistas FOR SELECT 
        TO anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gobernanza_entrevistas' AND policyname = 'Permitir all anon en entrevistas'
    ) THEN
        CREATE POLICY "Permitir all anon en entrevistas" 
        ON public.gobernanza_entrevistas FOR ALL 
        TO anon USING (true);
    END IF;
END $$;

-- 3. Enable Realtime Replication
ALTER TABLE public.gobernanza_audio_chunks REPLICA IDENTITY FULL;
ALTER TABLE public.gobernanza_entrevistas REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gobernanza_audio_chunks;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gobernanza_entrevistas;
    EXCEPTION WHEN duplicate_object THEN
        -- already added
    END;
END $$;
