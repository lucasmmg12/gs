import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const targetNumber = body.number || body.to || body.phone_number || ''
    const targetMessage = body.message || body.body || body.text || ''
    const mediaUrl = body.mediaUrl || body.media_url || null
    const organizationId = body.organization_id || null

    if (!targetNumber || !targetMessage) {
      throw new Error('Number and message are required')
    }

    // Optional: Log to database if Supabase credentials exist
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        let normalizedPhone = targetNumber.replace(/\D/g, '')
        await supabase.from('whatsapp_messages').insert([{
          organization_id: organizationId,
          phone_number: normalizedPhone,
          direction: 'outgoing',
          body: targetMessage,
          media_url: mediaUrl && mediaUrl.trim() !== '' ? mediaUrl : null,
          sender_name: 'Consultora GS'
        }])
      } catch (logErr) {
        console.warn('Could not log message to db:', logErr)
      }
    }

    const API_URL = Deno.env.get('VITE_BUILDERBOT_API_URL') || Deno.env.get('BUILDERBOT_API_URL')
    const API_KEY = Deno.env.get('VITE_BUILDERBOT_API_KEY') || Deno.env.get('BUILDERBOT_API_KEY')
    
    if (!API_URL || !API_KEY) {
      return new Response(JSON.stringify({ 
        success: true, 
        simulated: true, 
        message: 'Message stored in database. BuilderBot API credentials are not configured yet.' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload: any = {
      number: targetNumber,
      message: targetMessage,
    }

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
    return new Response(JSON.stringify({ error: (error as any).message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
