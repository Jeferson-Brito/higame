import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type UserRole = 'admin' | 'employee'

interface CreateEmployeePayload {
  full_name: string
  email: string
  password: string
  position?: string
  team?: string
  role?: UserRole
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Variáveis do Supabase não configuradas na Edge Function.' }, 500)
  }

  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return jsonResponse({ error: 'Sessão ausente.' }, 401)
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Sessão inválida.' }, 401)
  }

  const { data: requesterProfile, error: requesterError } = await adminClient
    .from('profiles')
    .select('role, deleted_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (requesterError) {
    return jsonResponse({ error: requesterError.message }, 500)
  }

  if (requesterProfile?.role !== 'admin' || requesterProfile.deleted_at) {
    return jsonResponse({ error: 'Apenas administradores podem criar colaboradores.' }, 403)
  }

  let payload: CreateEmployeePayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, 400)
  }

  const fullName = cleanString(payload.full_name)
  const email = cleanString(payload.email).toLowerCase()
  const password = cleanString(payload.password)
  const role = payload.role === 'admin' ? 'admin' : 'employee'
  const position = cleanString(payload.position) || null
  const team = cleanString(payload.team) || null

  if (!fullName) {
    return jsonResponse({ error: 'Nome completo é obrigatório.' }, 400)
  }

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'Email inválido.' }, 400)
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  })

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message ?? 'Erro ao criar usuário.' }, 400)
  }

  const profilePayload = {
    id: created.user.id,
    full_name: fullName,
    role,
    position,
    team,
    is_active: true,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('*')
    .single()

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return jsonResponse({ error: profileError.message }, 500)
  }

  return jsonResponse({
    user: {
      id: created.user.id,
      email: created.user.email,
    },
    profile,
  })
})
