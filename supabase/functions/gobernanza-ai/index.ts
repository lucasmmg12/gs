import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (action === 'transcribe_and_analyze') {
      const { entrevista_id, plantilla_id, audio_path, manual_answers } = payload;
      console.log(`Iniciando procesamiento para entrevista: ${entrevista_id}`);

      // 1. Obtener la plantilla para las preguntas
      const { data: plantilla } = await supabase
        .from('gobernanza_plantillas')
        .select('preguntas')
        .eq('id', plantilla_id)
        .single();
      
      const preguntas = plantilla?.preguntas || [];

      // 2. Descargar audio de Storage
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('gobernanza_audios')
        .download(audio_path);

      if (downloadError) throw new Error(`Error descargando audio: ${downloadError.message}`);

      // 3. Transcripción con Whisper (OpenAI)
      const audioFile = new File([audioData], "audio.webm", { type: "audio/webm" });
      
      console.log("Transcribiendo con OpenAI Whisper...");
      const transcriptResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        temperature: 0.2,
        language: "es"
      });
      
      const transcripcionCompleta = transcriptResponse.text;
      console.log("Transcripción completada.");

      // 4. Análisis Estructurado con GPT-4o-mini o GPT-4o
      console.log("Iniciando análisis con GPT...");
      
      const prompt = `Eres un auditor experto clínico/administrativo. A continuación te proveo la transcripción de una reunión/entrevista y una lista de preguntas de gobernanza.
      
      PREGUNTAS DE GOBERNANZA:
      ${JSON.stringify(preguntas)}

      MAPEO MANUAL PARCIAL:
      ${JSON.stringify(manual_answers || {})}
      
      TRANSCRIPCIÓN:
      ${transcripcionCompleta}
      
      Debes analizar la transcripción y extraer la siguiente información en formato estrictamente JSON:
      {
        "resumen": "Un resumen ejecutivo corto de toda la reunión",
        "respuestas_cuestionario": ["respuesta a la pregunta 1", "respuesta a la pregunta 2", "..."], // Debe coincidir en longitud con el array de preguntas.
        "mapa_conceptual_mermaid": "Código en formato Mermaid (graph TD) que represente los conceptos y decisiones principales de la reunión. Solo devuelve el código Mermaid válido, sin comillas triples alrededor.",
        "minutas": { "decisiones": [], "tareas_pendientes": [], "riesgos": [] }
      }
      
      Asegúrate de que 'respuestas_cuestionario' tenga las respuestas extraídas de la reunión correspondientes al orden de las preguntas planteadas. Si no se habló de algo, indica 'No se menciona en la grabación'. Devuelve el JSON puro.`;

      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" }
      });

      const iaResultRaw = chatResponse.choices[0].message?.content || '{}';
      let iaResult = { resumen: '', respuestas_cuestionario: [], mapa_conceptual_mermaid: '', minutas: {} };
      try {
          iaResult = JSON.parse(iaResultRaw);
      } catch (e) {
          console.error("Error parseando respuesta de GPT", e);
      }

      // 5. Actualizar en base de datos
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

      return new Response(JSON.stringify({ success: true, message: "Procesamiento completado" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    }

    return new Response(JSON.stringify({ error: "Action not recognized" }), { headers: corsHeaders, status: 400 });

  } catch (error) {
    console.error("Error en Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
