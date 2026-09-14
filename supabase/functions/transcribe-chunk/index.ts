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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const openai = new OpenAI({ apiKey: openaiApiKey });

    let audioBlob: Blob | null = null;
    let sessionId = '';
    let clientId = '';
    let chunkIndex = 0;
    let questionId: string | null = null;
    let questionTitle: string | null = null;
    let meetingTitle = 'Reunión en vivo';
    let storagePath: string | null = null;
    let durationSeconds = 30;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      sessionId = (formData.get('sessionId') as string) || (formData.get('session_id') as string) || '';
      clientId = (formData.get('clientId') as string) || (formData.get('client_id') as string) || '';
      chunkIndex = parseInt((formData.get('chunkIndex') as string) || (formData.get('chunk_index') as string) || '0', 10);
      questionId = formData.get('questionId') as string || null;
      questionTitle = formData.get('questionTitle') as string || null;
      meetingTitle = (formData.get('meetingTitle') as string) || meetingTitle;
      storagePath = formData.get('storagePath') as string || null;
      if (formData.get('durationSeconds')) {
        durationSeconds = parseFloat(formData.get('durationSeconds') as string);
      }

      if (file) {
        audioBlob = file;
      }
    } else {
      const json = await req.json();
      sessionId = json.sessionId || json.session_id || '';
      clientId = json.clientId || json.client_id || '';
      chunkIndex = json.chunkIndex ?? json.chunk_index ?? 0;
      questionId = json.questionId || null;
      questionTitle = json.questionTitle || null;
      meetingTitle = json.meetingTitle || meetingTitle;
      storagePath = json.storagePath || null;
      durationSeconds = json.durationSeconds || 30;

      if (json.audioBase64) {
        const binary = atob(json.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: json.mimeType || 'audio/webm' });
      } else if (storagePath) {
        // Download from Supabase Storage
        const { data: storageData, error: dlErr } = await supabase.storage
          .from('gobernanza_audios')
          .download(storagePath);
        if (!dlErr && storageData) {
          audioBlob = storageData;
        }
      }
    }

    if (!sessionId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sessionId and clientId are mandatory.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!audioBlob || audioBlob.size < 500) {
      // Empty or silent chunk, return early with empty text
      console.log(`[transcribe-chunk] Chunk ${chunkIndex} for session ${sessionId} is empty or silent (${audioBlob?.size || 0} bytes).`);
      return new Response(
        JSON.stringify({
          success: true,
          chunkIndex,
          transcription: '',
          accumulatedTranscript: '',
          sessionId,
          empty: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. If storagePath was not provided, upload to Supabase Storage now
    if (!storagePath) {
      storagePath = `${clientId}/${sessionId}/chunk_${String(chunkIndex).padStart(4, '0')}.webm`;
      await supabase.storage
        .from('gobernanza_audios')
        .upload(storagePath, audioBlob, {
          contentType: 'audio/webm;codecs=opus',
          upsert: true
        });
    }

    // 2. Transcribe with OpenAI Whisper
    console.log(`[transcribe-chunk] Transcribing chunk ${chunkIndex} (${audioBlob.size} bytes)...`);
    const audioFile = new File([audioBlob], `chunk_${chunkIndex}.webm`, { type: 'audio/webm' });

    let transcriptText = '';
    try {
      const whisperResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'es',
        temperature: 0.2
      });
      transcriptText = (whisperResponse.text || '').trim();
    } catch (whisperErr: any) {
      console.warn(`[transcribe-chunk] Whisper API warning:`, whisperErr.message);
      // Graceful degradation: do not break the whole flow if Whisper returns an error for a noisy chunk
      transcriptText = '';
    }

    // Filter out common Whisper hallucination tokens on background noise
    const hallucinationPatterns = [
      /^[\.\,\!\?\s]+$/,
      /^(Subtítulos realizados por|Sintonía de cierre|Música de fondo|Gracias por ver este video)/i,
      /^[♪♫\s]+$/
    ];
    if (hallucinationPatterns.some(pat => pat.test(transcriptText))) {
      transcriptText = '';
    }

    console.log(`[transcribe-chunk] Chunk ${chunkIndex} transcription: "${transcriptText}"`);

    // 3. Ensure parent interview row exists in gobernanza_entrevistas
    await supabase.from('gobernanza_entrevistas').upsert({
      id: sessionId,
      client_id: clientId,
      titulo: meetingTitle,
      estado: 'grabando',
      live_status: 'recording',
      duracion_segundos: (chunkIndex + 1) * 30
    }, { onConflict: 'id', ignoreDuplicates: true });

    // 4. Save chunk into gobernanza_audio_chunks (database real-time persistence)
    const { error: insertChunkErr } = await supabase
      .from('gobernanza_audio_chunks')
      .upsert({
        session_id: sessionId,
        client_id: clientId,
        chunk_index: chunkIndex,
        storage_path: storagePath,
        transcription: transcriptText,
        duration_seconds: durationSeconds,
        question_id: questionId,
        question_title: questionTitle,
        speaker: 'Participante',
        is_final: true,
        metadata: {
          file_size_bytes: audioBlob.size,
          engine: 'whisper-1',
          processed_at: new Date().toISOString()
        }
      }, { onConflict: 'session_id,chunk_index' });

    if (insertChunkErr) {
      console.error('[transcribe-chunk] Error inserting chunk into DB:', insertChunkErr.message);
    }

    // 5. Calculate and persist accumulated transcript in real-time in gobernanza_entrevistas
    const { data: allChunks } = await supabase
      .from('gobernanza_audio_chunks')
      .select('chunk_index, transcription')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true });

    const accumulatedTranscript = (allChunks || [])
      .map(c => (c.transcription || '').trim())
      .filter(Boolean)
      .join(' ');

    await supabase
      .from('gobernanza_entrevistas')
      .update({
        transcripcion_raw: accumulatedTranscript,
        transcripcion: accumulatedTranscript,
        live_status: 'recording',
        duracion_segundos: (chunkIndex + 1) * 30
      })
      .eq('id', sessionId);

    // 6. Return response to caller
    return new Response(
      JSON.stringify({
        success: true,
        chunkIndex,
        transcription: transcriptText,
        accumulatedTranscript,
        storagePath,
        sessionId,
        clientId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (err: any) {
    console.error('[transcribe-chunk] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Error processing audio chunk' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
