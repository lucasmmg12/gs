-- WhatsApp Messages Table
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    message_type TEXT DEFAULT 'text',
    body TEXT,
    media_url TEXT,
    sender_name TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Shortcuts Table
CREATE TABLE whatsapp_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    shortcut_key TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WhatsApp messages view policy" ON whatsapp_messages
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "WhatsApp shortcuts view policy" ON whatsapp_shortcuts
FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_messages_modtime BEFORE UPDATE ON whatsapp_messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_whatsapp_shortcuts_modtime BEFORE UPDATE ON whatsapp_shortcuts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', false) ON CONFLICT DO NOTHING;

-- RLS for Storage (Objects)
-- Audios Bucket (Strict ADM-QUI Governance)
CREATE POLICY "Audios are accessible by authenticated users" ON storage.objects
FOR SELECT USING (
    bucket_id = 'audios' AND auth.role() = 'authenticated'
);
CREATE POLICY "Audios can be uploaded by authenticated users" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'audios' AND auth.role() = 'authenticated'
);

-- WhatsApp Media Bucket (Public)
CREATE POLICY "WhatsApp media is publicly accessible" ON storage.objects
FOR SELECT USING (
    bucket_id = 'whatsapp-media'
);
CREATE POLICY "WhatsApp media can be uploaded by authenticated users" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated'
);
