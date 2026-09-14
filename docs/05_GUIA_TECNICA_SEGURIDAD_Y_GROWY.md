# Guía Técnica de Arquitectura, Seguridad y Agente IA "Growy"
**Consultora GS — Manual de Infraestructura y Gobernanza de Datos**  
*Versión: 2.0 • Manual Técnico de Sistemas*

---

## 1. Arquitectura General del Sistema

La plataforma de **Consultora GS** está diseñada bajo un modelo de alta disponibilidad, resiliencia offline/online y aislamiento de datos de grado bancario para proteger el secreto industrial de cada PyME asesorada:

```
[ Frontend: React 18 + Vite + Tailwind CSS + Lucide Icons ]
   │
   ├── [ WebSockets 16kHz PCM ] ───────► [ Motor Whisper Live Stream ]
   │                                           │ (Fallback a Web Speech API)
   ├── [ IndexedDB Local (30s Chunks) ] ──────► [ Respaldo Offline ]
   │
   └── [ Supabase Client (HTTPS / WSS) ]
         │
         ├── [ PostgreSQL con RLS (Row-Level Security) ]
         │     ├── organizations (Clientes)
         │     ├── gobernanza_entrevistas (Sesiones, Grabaciones y Check out)
         │     ├── diagnostic_responses (78 Preguntas y Evidencias)
         │     ├── master_plan_quarterly_reviews (Seguimientos 90 Días)
         │     └── omv_modules (Visión Trienal y Minutas)
         │
         └── [ Supabase Edge Functions (Deno / TypeScript) ]
               ├── growy-chat (Agente IA con Aislamiento Tenant)
               └── send-whatsapp (Notificaciones automatizadas)
```

---

## 2. Aislamiento Multi-Tenant Estricto del Agente "Growy"

### El Riesgo:
"Growy" es el asistente de Inteligencia Artificial integrado en el sistema. Posee acceso en profundidad a las transcripciones, minutas, balances y diagnósticos del cliente para brindar respuestas contextuales de alto nivel.  
**Sin embargo, en un entorno de consultoría con múltiples clientes competidores, una fuga de datos entre empresas causaría un daño irreparable.**

### Medidas de Blindaje Implementadas:

#### A. Directiva de Seguridad Nivel 0 (System Prompt Enforced):
En la Edge Function `supabase/functions/growy-chat/index.ts`, se inyecta una directiva de seguridad inquebrantable:
```text
REGLA DE PRIVACIDAD CRÍTICA Y AISLAMIENTO MULTI-TENANT:
- Tienes acceso al cliente activo con ID: [scopedOrgId].
- ESTRICTAMENTE PROHIBIDO mezclar información, citar ejemplos, o responder con datos 
  pertenecientes a otros clientes o empresas bajo ninguna circunstancia.
- Todas las consultas a herramientas de base de datos DEBEN filtrar únicamente 
  por organization_id / client_id = [scopedOrgId].
- Si el usuario te pregunta por otra empresa, responde con firmeza que tus protocolos 
  de seguridad impiden acceder a datos ajenos al expediente activo.
```

#### B. Filtrado Duro a Nivel de Base de Datos (Zero-Trust Tool Execution):
Todas las herramientas disponibles para el agente IA validan el `scopedOrgId`:
- `query_meetings`: Solo consulta `meetings` donde `organization_id = scopedOrgId`.
- `query_minutes`: Solo consulta `minutes` donde `meeting.organization_id = scopedOrgId`.
- `query_master_plan`: Solo consulta `master_plan_tasks` donde `organization_id = scopedOrgId`.
- `query_quarterly_reviews`: Solo consulta `master_plan_quarterly_reviews` donde `organization_id = scopedOrgId`.
- `query_diagnostic_360`: Solo consulta `diagnostic_responses` donde `organization_id = scopedOrgId`.
- `query_gobernanza`: Solo consulta `gobernanza_entrevistas` donde `client_id = scopedOrgId`.

#### C. Control Visual en Frontend:
En `src/components/GrowyChat.tsx`, el panel de chat detecta automáticamente el cliente en pantalla y muestra un distintivo de seguridad activo:
```
[🛡️ Aislamiento Activo: Empresa SAS • Multi-tenant Seguro]
```
Si el usuario intenta forzar la remoción del identificador, el backend rechaza la solicitud arrojando un error `400 Bad Request: Missing organization_id`.

---

## 3. Arquitectura del Streaming Whisper y Persistencia Local

### A. Captura y Digitalización (16 kHz PCM):
- La clase `WhisperLiveStreamer` (`src/lib/whisperLiveStream.ts`) captura el flujo del micrófono mediante `AudioContext` con muestreo forzado a **16.000 Hz monoaural**.
- Los buffers de coma flotante de 32 bits se transforman a enteros con signo de 16 bits (`Int16Array`) para máxima compatibilidad con motores Whisper WebSockets.

### B. Protocolo de Fallback Automático:
Si la conexión WebSocket remota no responde o se degrada:
1. El streamer dispara el evento `status: 'fallback'`.
2. Activa de inmediato el motor `webkitSpeechRecognition` nativo del navegador del consultor.
3. El flujo de transcripción en pantalla continúa sin interrupción, permitiendo que la reunión no se detenga.

### C. Estrategia de Persistencia de 30 Segundos:
- Cada 30 segundos, el `MediaRecorder` genera un fragmento binario WebM.
- Se almacena de inmediato en **IndexedDB** (`audioChunker.ts`).
- Se sube asíncronamente al bucket `audio-recordings` de Supabase Storage.
- En caso de desconexión abrupta o reinicio forzado del equipo, la sesión de grabación se puede recuperar y recompilar desde la base de datos local del navegador.

---

## 4. Variables de Entorno Requeridas (`.env`)

Para desplegar y operar la plataforma, asegúrese de contar con las siguientes variables en su archivo `.env`:

```env
# Supabase Backend
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Whisper Live WebSockets Server
VITE_WHISPER_WS_URL="wss://api.whisper.yourdomain.com/live"

# OpenAI / AI Services
OPENAI_API_KEY="sk-proj-..."
VITE_OPENAI_API_KEY="sk-proj-..."

# Edge Functions / WhatsApp
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

---

## 5. Protocolo de Despliegue de Migraciones SQL

Para aplicar nuevas tablas y políticas RLS:
```bash
# Vincular con proyecto Supabase
supabase link --project-ref <PROJECT_ID>

# Aplicar migraciones
supabase db push
```
La migración [`20260914000000_meetings_lifecycle_and_quarterly_masterplan.sql`](file:///c:/Users/lucas/Proyectos/Gs/supabase/migrations/20260914000000_meetings_lifecycle_and_quarterly_masterplan.sql) garantiza que todas las tablas cuenten con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` y políticas de acceso basadas en `auth.uid()`.
