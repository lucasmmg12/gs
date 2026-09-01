import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // Duplicate prevention: skip outgoing messages as frontend inserts them optimistically (Sanatorio pattern)
    if (payload.eventName === 'message.outgoing') {
      return new Response(JSON.stringify({ status: 'ignored' }), { headers: { 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
       throw new Error('Supabase variables missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse incoming message
    // Note: Normalize phone by stripping non-digits and 549 (Sanatorio pattern)
    let phone = payload.data?.from || ''
    phone = phone.replace(/\D/g, '').replace(/^549/, '')

    const messageData = {
      phone_number: phone,
      direction: 'incoming',
      body: payload.data?.body || '',
      message_type: payload.data?.type || 'text',
      media_url: payload.data?.mediaUrl || null
    }

    const { error } = await supabase
      .from('whatsapp_messages')
      .insert([messageData])

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { 'Content-Type': 'application/json' }, status: 400 })
  }
})
