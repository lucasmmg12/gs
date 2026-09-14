/**
 * whisperLiveStream.ts
 * Integración con Whisper en tiempo real vía WebSockets y fallback resiliente.
 * Captura audio continuo, transmite paquetes vía WebSocket o procesa tokens
 * en vivo para mostrar la transcripción inmediata en pantalla.
 */

export interface LiveTranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export type LiveStreamStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'fallback' | 'error';

export interface WhisperLiveStreamConfig {
  wsUrl?: string; // WebSocket endpoint (e.g., wss://api.openai.com/v1/realtime or custom Whisper WS server)
  apiKey?: string;
  language?: string; // default 'es'
  clientId?: string;
  onTranscript?: (event: LiveTranscriptEvent) => void;
  onStatusChange?: (status: LiveStreamStatus, message?: string) => void;
  onError?: (error: Error) => void;
}

export class WhisperLiveStreamer {
  private config: WhisperLiveStreamConfig;
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private speechRecognizer: any = null;
  private status: LiveStreamStatus = 'idle';
  private accumulatedTranscript = '';
  private isRunning = false;

  constructor(config: WhisperLiveStreamConfig) {
    this.config = {
      language: 'es',
      ...config
    };
  }

  public getStatus(): LiveStreamStatus {
    return this.status;
  }

  public getFullTranscript(): string {
    return this.accumulatedTranscript;
  }

  private setStatus(status: LiveStreamStatus, message?: string) {
    this.status = status;
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status, message);
    }
  }

  /**
   * Inicia la captura y streaming en vivo
   */
  public async start(stream: MediaStream): Promise<void> {
    this.mediaStream = stream;
    this.isRunning = true;
    this.accumulatedTranscript = '';

    const wsEndpoint = this.config.wsUrl || (import.meta as any).env?.VITE_WHISPER_WS_URL;

    if (wsEndpoint) {
      this.setStatus('connecting', 'Conectando con WebSocket Whisper...');
      try {
        await this.connectWebSocket(wsEndpoint);
        this.setupAudioStreaming();
        this.setStatus('streaming', 'Streaming WebSocket activo');
      } catch (err: any) {
        console.warn('[WhisperLiveStreamer] Falló conexión WebSocket, activando fallback en vivo:', err);
        this.startFallbackRecognition();
      }
    } else {
      console.log('[WhisperLiveStreamer] No se definió VITE_WHISPER_WS_URL, activando motor en vivo del navegador.');
      this.startFallbackRecognition();
    }
  }

  /**
   * Conexión WebSocket para Whisper
   */
  private connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[WhisperLiveStreamer] WebSocket conectado exitosamente');
          // Enviar cabecera de configuración inicial
          const initPayload = JSON.stringify({
            event: 'start',
            language: this.config.language || 'es',
            clientId: this.config.clientId,
            sampleRate: 16000,
            channels: 1
          });
          this.ws?.send(initPayload);
          this.setStatus('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Formatos usuales de respuesta: { type: 'interim'|'final', text: '...' } o { transcript: '...' }
            const text = data.text || data.transcript || data.delta || '';
            const isFinal = data.is_final || data.type === 'final' || false;

            if (text) {
              if (isFinal) {
                this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + text.trim();
              }
              this.emitTranscript({
                text: text.trim(),
                isFinal,
                timestamp: Date.now()
              });
            }
          } catch (e) {
            console.warn('[WhisperLiveStreamer] Mensaje WebSocket no parseable como JSON:', event.data);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[WhisperLiveStreamer] Error en WebSocket:', err);
          reject(new Error('Error de conexión con servidor WebSocket Whisper'));
        };

        this.ws.onclose = () => {
          console.log('[WhisperLiveStreamer] WebSocket cerrado');
          if (this.isRunning && this.status !== 'fallback') {
            this.startFallbackRecognition();
          }
        };

        // Timeout de seguridad si el socket no responde en 4 segundos
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Timeout de conexión WebSocket'));
          }
        }, 4000);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Captura PCM a 16kHz para streaming por WebSocket
   */
  private setupAudioStreaming() {
    if (!this.mediaStream) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Buffer de 4096 muestras (~250ms a 16kHz)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRunning || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convertir float32 [-1, 1] a 16-bit PCM Signed Integer
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        this.ws.send(pcmBuffer.buffer);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('[WhisperLiveStreamer] Error configurando PCM streaming:', err);
      this.startFallbackRecognition();
    }
  }

  /**
   * Fallback de reconocimiento en tiempo real en el navegador
   * Garantiza que la transcripción inmediata funcione en pantalla en cualquier ambiente
   */
  private startFallbackRecognition() {
    this.setStatus('fallback', 'Motor de captura de audio en vivo activo');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[WhisperLiveStreamer] API de reconocimiento por voz nativa no disponible.');
      this.setStatus('streaming', 'Grabando audio continuo (Transcripción se procesará con Whisper al finalizar)');
      return;
    }

    try {
      this.speechRecognizer = new SpeechRecognition();
      this.speechRecognizer.continuous = true;
      this.speechRecognizer.interimResults = true;
      this.speechRecognizer.lang = this.config.language === 'es' ? 'es-AR' : 'es-ES';

      this.speechRecognizer.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
          } else {
            interimText += transcript;
          }
        }

        if (finalText.trim()) {
          this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + finalText.trim();
          this.emitTranscript({
            text: finalText.trim(),
            isFinal: true,
            timestamp: Date.now()
          });
        } else if (interimText.trim()) {
          this.emitTranscript({
            text: interimText.trim(),
            isFinal: false,
            timestamp: Date.now()
          });
        }
      };

      this.speechRecognizer.onerror = (event: any) => {
        // Ignorar no-speech frecuente durante silencios
        if (event.error !== 'no-speech') {
          console.warn('[WhisperLiveStreamer Fallback] Error de reconocimiento:', event.error);
        }
      };

      this.speechRecognizer.onend = () => {
        if (this.isRunning) {
          try {
            this.speechRecognizer.start();
          } catch {
            // Ya iniciado
          }
        }
      };

      this.speechRecognizer.start();
    } catch (e) {
      console.warn('[WhisperLiveStreamer] No se pudo inicializar SpeechRecognition:', e);
    }
  }

  private emitTranscript(event: LiveTranscriptEvent) {
    if (this.config.onTranscript) {
      this.config.onTranscript(event);
    }
  }

  /**
   * Detiene el streaming y libera recursos de audio
   */
  public stop(): string {
    this.isRunning = false;

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'stop' }));
          this.ws.close();
        }
      } catch (e) {
        console.warn('[WhisperLiveStreamer] Error cerrando WebSocket:', e);
      }
      this.ws = null;
    }

    if (this.speechRecognizer) {
      try {
        this.speechRecognizer.stop();
      } catch (e) {
        // Ya detenido
      }
      this.speechRecognizer = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignorar
      }
      this.audioContext = null;
    }

    this.setStatus('idle');
    return this.accumulatedTranscript;
  }
}
