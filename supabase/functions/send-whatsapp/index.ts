import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { number, message, mediaUrl } = await req.json()
    const API_URL = Deno.env.get('VITE_BUILDERBOT_API_URL')
    const API_KEY = Deno.env.get('VITE_BUILDERBOT_API_KEY')
    
    if (!API_URL || !API_KEY) {
      throw new Error('BuilderBot credentials missing')
    }

    const payload: any = {
      number,
      message,
    }

    // Workaround: BuilderBot API rejects empty mediaUrl strings (Sanatorio pattern)
    if (mediaUrl && mediaUrl.trim() !== '') {
      payload.mediaUrl = mediaUrl
    }

    const response = await fetch(`${API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
