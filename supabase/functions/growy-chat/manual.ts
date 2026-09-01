export const MANUAL_PROCEDIMIENTOS = `
# Manual de Procedimientos - Consultora GS

Este manual establece los flujos de trabajo operativos de la plataforma, garantizando que el ciclo de vida de la información (reuniones, minutas, diagnósticos y plan maestro) se realice de forma controlada y segura, asegurando la separación de datos entre clientes y la validación humana sobre los procesos asistidos por IA.

## PR-01: Gestión de Reuniones, Minutas y Publicación

Este procedimiento describe el paso a paso desde que finaliza una tutoría/reunión con un cliente, hasta que la minuta oficial es publicada en su portal.

### Fases del Procedimiento

#### 1. Registro Inicial (Consultor)
- **Acción:** Finalizar la reunión e ingresar a la plataforma.
- **Paso 1:** Registrar la reunión asociándola inequívocamente al cliente correcto en la base de datos.
- **Paso 2:** Adjuntar o vincular el archivo de audio de la sesión.

#### 2. Procesamiento Inteligente (IA / Sistema)
- **Paso 3 (Automático):** El motor de IA transcribe el audio.
- **Paso 4 (Validación):** El consultor revisa la identificación de los participantes.
- **Paso 5 (Borrador):** La IA genera un borrador inicial de la minuta basándose en la plantilla oficial de GS.
- **Paso 6 (Estructuración):** El sistema extrae automáticamente acuerdos, decisiones, pendientes y próximos pasos.

#### 3. Revisión y Aprobación (Consultor / Autoridad GS)
- **Paso 7 (Revisión):** El consultor lee el borrador. (Los borradores son de uso estrictamente interno).
- **Paso 8 (Corrección):** El consultor realiza ediciones sobre el texto de la minuta.
- **Paso 9 (Aprobación):** El rol autorizado cambia el estado de la minuta a Aprobado. (Nada generado por IA puede publicarse sin validación humana).

#### 4. Publicación y Cierre (Sistema)
- **Paso 10 (Publicación):** El sistema publica la minuta en el portal del cliente.
- **Paso 11 (Notificación):** Se dispara un aviso automático al cliente.
- **Paso 12 (Generación de Compromisos):** Los compromisos detectados se registran formalmente.
- **Paso 13 (Alimentación del Diagnóstico):** La evidencia extraída se vincula al modelo del Diagnóstico Integral 360°.

## Políticas Generales de Seguridad y Auditoría
1. **Segregación Absoluta:** Un usuario/cliente solo tiene acceso a la información de su propia organización.
2. **Versionado Inmutable:** Cuando una minuta ya publicada requiere corrección, se genera una nueva versión.
3. **Privacidad Front/Back:** Los estados Borrador, En Revisión u Observado son invisibles en el portal del cliente final.
`;
