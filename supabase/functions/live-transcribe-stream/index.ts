import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active connections keyed by sessionId
const activeSessions = new Map<string, Set<WebSocket>>();

serve((req) => {
  const upgrade = req.headers.get('upgrade') || '';

  if (upgrade.toLowerCase() === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req);

    let clientSessionId = '';
    let clientId = '';

    socket.onopen = () => {
      console.log('[live-transcribe-stream] Client WebSocket connected');
      socket.send(JSON.stringify({
        type: 'connected',
        message: 'Conexión WebSocket establecida con Supabase Edge Server.',
        timestamp: Date.now()
      }));
    };

    socket.onmessage = async (event) => {
      try {
        let msg: any;
        if (typeof event.data === 'string') {
          msg = JSON.parse(event.data);
        } else {
          // Binary audio packet received (e.g. PCM 16kHz)
          // Echo confirmation of bytes received
          socket.send(JSON.stringify({
            type: 'audio_ack',
            bytesReceived: (event.data as ArrayBuffer).byteLength,
            timestamp: Date.now()
          }));
          return;
        }

        switch (msg.type || msg.event) {
          case 'register':
          case 'start':
            clientSessionId = msg.sessionId || msg.session_id || '';
            clientId = msg.clientId || msg.client_id || '';
            if (clientSessionId) {
              if (!activeSessions.has(clientSessionId)) {
                activeSessions.set(clientSessionId, new Set());
              }
              activeSessions.get(clientSessionId)!.add(socket);
            }
            socket.send(JSON.stringify({
              type: 'registered',
              sessionId: clientSessionId,
              clientId,
              status: 'streaming_active'
            }));
            break;

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          case 'chunk_sent':
            // Broadcast chunk status to any listeners of the same session
            if (clientSessionId && activeSessions.has(clientSessionId)) {
              const peers = activeSessions.get(clientSessionId)!;
              const broadcastData = JSON.stringify({
                type: 'chunk_progress',
                chunkIndex: msg.chunkIndex,
                timestamp: Date.now()
              });
              peers.forEach(peer => {
                if (peer.readyState === WebSocket.OPEN) {
                  peer.send(broadcastData);
                }
              });
            }
            break;

          case 'stop':
            socket.send(JSON.stringify({ type: 'stopped', sessionId: clientSessionId }));
            break;

          default:
            socket.send(JSON.stringify({ type: 'ack', originalEvent: msg.type || msg.event }));
        }
      } catch (err: any) {
        console.warn('[live-transcribe-stream] Error processing socket message:', err.message);
      }
    };

    socket.onclose = () => {
      if (clientSessionId && activeSessions.has(clientSessionId)) {
        activeSessions.get(clientSessionId)!.delete(socket);
        if (activeSessions.get(clientSessionId)!.size === 0) {
          activeSessions.delete(clientSessionId);
        }
      }
      console.log('[live-transcribe-stream] WebSocket client disconnected');
    };

    socket.onerror = (err) => {
      console.error('[live-transcribe-stream] Socket error:', err);
    };

    return response;
  }

  // HTTP Fallback / Status Check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      service: 'Supabase Edge WebSocket Live Audio Streaming',
      status: 'active',
      websocket_endpoint: 'wss://dtjmckbrofevgfqbkzli.supabase.co/functions/v1/live-transcribe-stream',
      active_sessions_count: activeSessions.size
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  );
});
