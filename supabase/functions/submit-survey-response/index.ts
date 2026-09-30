// ============================================================================
// Edge Function: submit-survey-response
// Purpose: Validate + store a survey response. Anon-allowed for open
// surveys, authenticated for logged_in surveys.
// Why server-side: the INSERT policy (anyone where status='open') can't
// rate-limit or validate answer shape against questions JSONB, and any
// captcha/secret would leak in the client. Logged_in surveys bind
// respondent_id server-side from the token (never trust client input).
// verify_jwt = false so anonymous open-survey submissions reach the code.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

// ponytail: in-memory per-worker rate limit, use Redis/Upstash if abused.
const hits = new Map<string, number[]>()

function rateLimited(key: string, windowMs = 60_000, max = 5): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  arr.push(now)
  hits.set(key, arr)
  return arr.length > max
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(`survey:${ip}`)) {
    return json({ error: 'Too many submissions, try again later' }, 429)
  }

  let surveyId = ''
  let answers: unknown = null
  try {
    const body = await req.json()
    surveyId = body?.surveyId ?? ''
    answers = body?.answers ?? null
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!surveyId || answers == null || typeof answers !== 'object') {
    return json({ error: 'surveyId and answers required' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: survey, error: surveyError } = await supabaseAdmin
    .from('surveys')
    .select('id, status, survey_type, questions')
    .eq('id', surveyId)
    .single()
  if (surveyError || !survey) return json({ error: 'Survey not found' }, 404)
  if (survey.status !== 'open') return json({ error: 'Survey is not open' }, 400)

  // Minimal shape check: answers must be an object keyed by question index,
  // with a value per defined question.
  const questions = Array.isArray(survey.questions) ? survey.questions : []
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return json({ error: 'answers must be an object' }, 400)
  }
  const keys = Object.keys(answers as Record<string, unknown>)
  if (questions.length > 0 && keys.length !== questions.length) {
    return json({ error: 'answers must cover every question' }, 400)
  }

  let respondentId: string | null = null
  if (survey.survey_type === 'logged_in') {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Login required for this survey' }, 401)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)
    respondentId = user.id

    // One response per member per survey.
    const { data: prior } = await supabaseAdmin
      .from('survey_responses')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('respondent_id', respondentId)
      .maybeSingle()
    if (prior) return json({ error: 'Already submitted' }, 409)
  }

  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .insert({ survey_id: surveyId, respondent_id: respondentId, answers })
    .select()
    .single()
  if (error) return json({ error: 'Failed to submit response' }, 500)

  return json({ success: true, response: data })
})
