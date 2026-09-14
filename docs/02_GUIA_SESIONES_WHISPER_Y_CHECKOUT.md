# Guía Operativa de Sesiones en Vivo, Whisper y Check out
**Consultora GS — Protocolo Técnico para Entrevistas y Comités**  
*Versión: 2.0 • Guía Práctica de Campo*

---

## 1. Preparación Previa a la Reunión

Antes de iniciar cualquier entrevista o sesión de trabajo con el cliente:
1. **Entorno de Grabación**:
   - Conectar un micrófono direccional o headset con cancelación de ruido.
   - Solicitar a los participantes hablar a volumen constante y evitar superponer voces.
2. **Acceso a la Plataforma**:
   - Ingresar a `https://app.consultorags.com` con usuario consultor.
   - Navegar a **Clientes** y abrir el expediente del cliente correspondiente.
   - Abrir la pestaña **Minutas de Sesiones**.

---

## 2. Configuración y Mapeo de Preguntas (Agenda)

El sistema cuenta con un selector de preguntas conectado a las **10 Áreas y 78 Preguntas** del catálogo oficial GS:

### Selección Manual o por Presets:
- **Preset 1. Kickoff (OMV)**: Carga las preguntas estratégicas de visión, modelo de negocio y gobierno inicial.
- **Preset 2. Diagnóstico 360°**: Selecciona las preguntas base de personas, procesos y estructura.
- **Preset 3. Gobernanza y Directorio**: Filtra el área legal, estatutaria y comités de dirección.
- **Preset 4. Operaciones y Procesos**: Filtra estandarización, compras, SLAs y logística.
- **Buscador Dinámico**: Puede buscar por palabras clave (ej: *"cashflow"*, *"organigrama"*, *"funnel"*).

> [!TIP]
> Para una sesión de 60 minutos, se recomienda planificar entre 4 y 8 preguntas para permitir profundización y captura de evidencias concretas.

---

## 3. Inicio de la Grabación y Transcripción en Vivo

Al pulsar **"Iniciar Grabación con Whisper"**:
1. **WakeLock Automático**:
   - El sistema activa la API `navigator.wakeLock` para impedir que la pantalla de la laptop o tablet entre en reposo durante la reunión.
2. **Streaming por WebSockets**:
   - El audio se digitaliza a 16 kHz PCM sin compresión previa y se envía en streaming directo al motor Whisper.
   - En el recuadro superior derecho verá el indicador pulsante `[En Vivo]` y el texto transcripto palabra por palabra en la pantalla.
   - **Mecanismo de Resiliencia (Fallback)**: Si la conexión a Internet experimenta microcortes o el WebSocket falla, el sistema conmuta sin pausa hacia la API nativa de voz del navegador, garantizando que ninguna frase se pierda.
3. **Persistencia Garantizada en Chunks de 30 Segundos**:
   - Cada 30 segundos exactos, el `MediaRecorder` emite un bloque de audio WebM.
   - El bloque se guarda de inmediato en **IndexedDB local** del navegador del consultor (blindaje contra cierres accidentales).
   - Simultáneamente se sube al bucket seguro de **Supabase Storage** bajo el path `audio-recordings/${clientId}/${sessionId}_chunk_${index}.webm`.
4. **Visualizador de Modulación de Audio (Redline Waveform)**:
   - Una barra osciloscópica en color rojo GS modula la intensidad de la voz en tiempo real, confirmando que el micrófono capta audio nítido.

---

## 4. Dinámica Durante la Entrevista

- Mientras el cliente responde, el consultor puede marcar la pregunta activa en la barra lateral para indexar el minuto exacto en el que se abordó.
- El consultor debe repreguntar ante respuestas ambiguas: *"¿Tienen este proceso por escrito o es un acuerdo verbal?"*.

---

## 5. Cierre de Grabación y Procesamiento de Inteligencia Artificial

Al hacer clic en **"Finalizar Sesión & Analizar"**:
1. El sistema detiene el micrófono y libera el WakeLock.
2. Reúne todos los chunks de 30s en un único archivo de audio consolidado (`${sessionId}_full.webm`).
3. Envía la transcripción completa al motor analítico de GS, el cual genera:
   - **Resumen Ejecutivo** estructurado en viñetas.
   - **Mapa Conceptual Interactivo** en sintaxis Mermaid.
   - **Extracción de Respuestas**: Mapeo automático de lo dicho por el cliente contra cada pregunta de la agenda.
   - **Entregable OMV** (si la sesión fue Kickoff).

---

## 6. Paso de Check out (Validación Humana Obligatoria)

> [!IMPORTANT]
> **REGLA DE ORO DE GS**: Las respuestas detectadas por la IA son solo borradores preliminares. Ningún dato impacta formalmente el perfil del cliente hasta completar el Check out.

### Pantalla de Check out:
1. **Revisión en Conjunto**: Con el cliente presente (o compartiendo pantalla en videollamada), el consultor revisa las respuestas asociadas a cada pregunta.
2. **Edición en Caliente**: Cada respuesta cuenta con un campo de texto editable para agregar precisiones, eliminar interpretaciones erróneas o sumar datos numéricos exactos.
3. **Identificación del Validador**:
   - Se consigna el nombre del líder que valida (ej. *"Ing. Roberto Gómez - Director General"*).
   - Se escribe el feedback final del cliente (ej. *"Se acordó presentar la matriz de compras en la próxima sesión"*).
4. **Confirmación e Impacto**:
   - Al pulsar **"Confirmar Check out e Impactar en Diagnóstico"**, el sistema:
     - Actualiza la tabla `diagnostic_responses` con las respuestas validadas y notas con marca de tiempo.
     - Si es Kickoff, actualiza la tabla `omv_modules`.
     - Actualiza el registro de la reunión en `gobernanza_entrevistas` marcando `validation_status = 'approved'`.
     - Actualiza el indicador de **Avance en el Perfil del Cliente** en el encabezado.

---

## 7. Entregables y Exportación Inmediata en PDF

Al concluir el Check out, se habilitan los botones de descarga con el branding oficial:
- **Kickoff**: Botón *"Descargar Entregable OMV (PDF)"* conteniendo la visión trienal, minuta y compromisos.
- **Diagnóstico / Seguimiento**: Botón *"Descargar Minuta / Auditoría (PDF)"* conteniendo la fecha, participantes, respuestas validadas y firmas de conformidad.
- **Historial**: La grabación queda indexada en la tabla inferior del cliente, lista para reproducir el audio completo o descargar la minuta en cualquier momento.
