import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_CASCADE = [
  Deno.env.get('OPENAI_MODEL'),
  'gpt-5.5',
  'gpt-5.4',
  'gpt-4.1',
  'gpt-4o'
].filter(Boolean) as string[];

const AUDIO_MODEL_CASCADE = [
  Deno.env.get('OPENAI_AUDIO_MODEL'),
  'gpt-4o-transcribe',
  'whisper-1'
].filter(Boolean) as string[];

async function createCompletionWithCascade(
  openai: OpenAI,
  params: Omit< Parameters<typeof openai.chat.completions.create>[0], 'model' >
): Promise<{ response: any; modelUsed: string }> {
  let lastError: any = null;
  for (const model of MODEL_CASCADE) {
    try {
      const response = await openai.chat.completions.create({
        ...params,
        model,
      } as any);
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[gobernanza-ai] Model ${model} unavailable, trying next in cascade:`, err?.message);
    }
  }
  throw lastError || new Error('All AI models in cascade failed');
}

async function createTranscriptionWithCascade(
  openai: OpenAI,
  file: File
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;
  for (const model of AUDIO_MODEL_CASCADE) {
    try {
      const response = await openai.audio.transcriptions.create({
        file,
        model,
        temperature: 0.1,
        language: 'es'
      });
      return { text: response.text || '', modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[gobernanza-ai] Audio model ${model} unavailable, trying fallback:`, err?.message);
    }
  }
  throw lastError || new Error('All audio transcription models failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Action 1: Transcribe uploaded audio file with GPT-4o-Transcribe / Whisper cascade
    if (action === 'transcribe_audio_file') {
      const { audio_path } = payload;
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('gobernanza_audios')
        .download(audio_path);

      if (downloadError) throw new Error(`Error descargando audio: ${downloadError.message}`);

      const pathExt = (audio_path.split('.').pop() || 'webm').toLowerCase();
      const mimeMap: Record<string, string> = {
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        mp4: 'audio/mp4',
        mp3: 'audio/mpeg',
        ogg: 'audio/ogg',
        webm: 'audio/webm'
      };
      const audioFile = new File([audioData], `audio.${pathExt}`, { type: mimeMap[pathExt] || 'audio/webm' });
      const { text, modelUsed } = await createTranscriptionWithCascade(openai, audioFile);

      return new Response(
        JSON.stringify({ success: true, transcript: text, audioModelUsed: modelUsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action 2: Automatic analysis of transcript against the 100 Diagnostic Questions + Minute + Report (GPT-5.5+ family)
    if (action === 'analyze_transcript_100') {
      const {
        client_name,
        meeting_title,
        duration_seconds,
        transcript,
        catalog,
        skip_minute
      } = payload;

      const totalQs = Array.isArray(catalog) ? catalog.length : 103;
      const systemPrompt = skip_minute
        ? `Sos el Motor de Inteligencia Ejecutiva de Consultora GS.
Tenés el catálogo oficial de ${totalQs} preguntas de diagnóstico empresarial 360° (11 áreas) y un bloque de transcripción real con "${client_name}" (${meeting_title}).

Tu misión:
1. Detectar TODAS las preguntas del catálogo (Q1 a Q${totalQs}) que tengan evidencia real directa o indirecta en este bloque. NO inventes respuestas sin evidencia.
2. Para cada pregunta detectada devolvé:
   - questionId (1..${totalQs}), questionCode ("Q13"), areaId, areaName, questionTitle
   - detectedQuote (cita textual breve y exacta del audio, máx 220 caracteres)
   - suggestedAnswer (síntesis ejecutiva clara y concisa con hechos/métricas reales, máx 280 caracteres)
   - suggestedOption: uno de ["formal_active", "informal_active", "partial_dev", "none_no_record"]
   - confidence: "alta" o "media"
   - reason: breve justificación (máx 80 caracteres)

Devolvé estrictamente JSON:
{
  "suggestions": [
    {
      "id": "auto-q-1",
      "questionId": 1,
      "questionCode": "Q1",
      "areaId": "area_1_direccion",
      "areaName": "Dirección y Estrategia",
      "questionTitle": "...",
      "detectedQuote": "...",
      "suggestedAnswer": "...",
      "suggestedOption": "partial_dev",
      "confidence": "alta",
      "reason": "Evidencia directa en audio",
      "isTangential": false,
      "status": "pending"
    }
  ]
}`
        : `Sos el Motor de Inteligencia Ejecutiva de última generación (Familia GPT-5.5+) de Consultora GS.
Tenés el catálogo oficial completo de ${totalQs} preguntas de diagnóstico empresarial 360° (divididas en 11 áreas, incluyendo Seguridad, Seguros y Gestión de Riesgos) y la transcripción completa de un audio de sesión con el cliente "${client_name}".

Tu misión es realizar un análisis profundo, semántico y contextual para:
1. Detectar TODAS las preguntas del catálogo (Q1 a Q${totalQs}) que se pueden responder directa o indirectamente con lo conversado en el audio. No inventes respuestas si no hay evidencia real en la transcripción.
2. Responder automáticamente cada pregunta detectada con redacción ejecutiva de nivel consultor senior, indicando:
   - questionId (número del 1 al ${totalQs})
   - questionCode (ej: "Q13")
   - areaId (ej: "area_2_finanzas")
   - areaName (nombre del área)
   - questionTitle (título de la pregunta)
   - detectedQuote (cita textual o evidencia exacta mencionada en el audio)
   - suggestedAnswer (diagnóstico ejecutivo claro, incluyendo métricas o hechos mencionados)
   - suggestedOption: uno de ["formal_active", "informal_active", "partial_dev", "none_no_record"] según el nivel real de madurez empresarial que se desprende del audio.
   - confidence: "alta" o "media"
   - reason: justificación metodológica breve
3. Generar la Minuta Ejecutiva completa de la reunión (con temas desarrollados por área, acuerdos, tabla de compromisos accionables y reflexión metodológica GS) y un diagrama conceptual Mermaid (graph TD).

Devuelve estrictamente un objeto JSON con esta estructura:
{
  "executiveReportSummary": "Resumen ejecutivo integral del diagnóstico relevado...",
  "conceptualMapMermaid": "graph TD\\n  A[...] --> B[...]",
  "suggestions": [
    {
      "id": "auto-q-1",
      "questionId": 1,
      "questionCode": "Q1",
      "areaId": "area_1_direccion",
      "areaName": "Dirección y Estrategia",
      "questionTitle": "...",
      "detectedQuote": "...",
      "suggestedAnswer": "...",
      "suggestedOption": "formal_active",
      "confidence": "alta",
      "reason": "Detectado en el audio",
      "isTangential": false,
      "status": "accepted"
    }
  ],
  "minute": {
    "meetingTitle": "${meeting_title}",
    "meetingDate": "${new Date().toLocaleDateString('es-AR')}",
    "attendeesGS": ["Consultor Líder GS"],
    "attendeesClient": ["Dirección ${client_name}"],
    "executiveSummary": "...",
    "topicsDiscussed": [{ "title": "1. ...", "points": ["..."] }],
    "agreements": ["..."],
    "commitments": [{ "id": "com-1", "responsible": "...", "task": "...", "deadline": "...", "status": "pendiente" }],
    "nextSteps": ["..."],
    "methodologicalReflection": "..."
  }
}`;

      const { response: chatResponse, modelUsed } = await createCompletionWithCascade(openai, {
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `CATÁLOGO DE 100 PREGUNTAS:\n${JSON.stringify(catalog)}\n\nTRANSCRIPCIÓN DEL AUDIO (${Math.round((duration_seconds || 60) / 60)} min):\n${transcript}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(chatResponse.choices[0].message?.content || '{}');
      return new Response(JSON.stringify({ ...parsed, aiModelUsed: modelUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (action === 'transcribe_and_analyze') {
      const { entrevista_id, plantilla_id, audio_path, manual_answers } = payload;
      console.log(`Iniciando procesamiento con motor 5.5+ para entrevista: ${entrevista_id}`);

      const { data: plantilla } = await supabase
        .from('gobernanza_plantillas')
        .select('preguntas')
        .eq('id', plantilla_id)
        .single();
      
      const preguntas = plantilla?.preguntas || [];

      const { data: audioData, error: downloadError } = await supabase.storage
        .from('gobernanza_audios')
        .download(audio_path);

      if (downloadError) throw new Error(`Error descargando audio: ${downloadError.message}`);

      const audioFile = new File([audioData], 'audio.webm', { type: 'audio/webm' });
      const { text: transcripcionCompleta, modelUsed: audioModel } = await createTranscriptionWithCascade(openai, audioFile);

      const prompt = `Eres el auditor senior de Consultora GS operando sobre la familia GPT-5.5+. Analiza la transcripción y extrae en JSON:
      PREGUNTAS: ${JSON.stringify(preguntas)}
      MAPEO MANUAL: ${JSON.stringify(manual_answers || {})}
      TRANSCRIPCIÓN: ${transcripcionCompleta}
      JSON requerido:
      {
        "resumen": "Resumen ejecutivo profundo",
        "respuestas_cuestionario": ["respuesta 1", "..."],
        "mapa_conceptual_mermaid": "graph TD...",
        "minutas": { "decisiones": [], "tareas_pendientes": [], "riesgos": [] }
      }`;

      const { response: chatResponse, modelUsed: chatModel } = await createCompletionWithCascade(openai, {
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const iaResultRaw = chatResponse.choices[0].message?.content || '{}';
      let iaResult = { resumen: '', respuestas_cuestionario: [], mapa_conceptual_mermaid: '', minutas: {} };
      try {
        iaResult = JSON.parse(iaResultRaw);
      } catch (e) {
        console.error('Error parseando respuesta de IA', e);
      }

      const { error: updateError } = await supabase
        .from('gobernanza_entrevistas')
        .update({
          transcripcion: transcripcionCompleta,
          resumen: iaResult.resumen,
          respuestas_cuestionario: iaResult.respuestas_cuestionario,
          mapa_conceptual_mermaid: iaResult.mapa_conceptual_mermaid,
          minutas: iaResult.minutas,
          estado: 'completado'
        })
        .eq('id', entrevista_id);

      if (updateError) throw new Error(`Error actualizando entrevista: ${updateError.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          transcript: transcripcionCompleta,
          aiModelUsed: chatModel,
          audioModelUsed: audioModel,
          message: 'Procesamiento completado'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Action not recognized' }), { headers: corsHeaders, status: 400 });

  } catch (error: any) {
    console.error('Error en Edge Function gobernanza-ai:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
