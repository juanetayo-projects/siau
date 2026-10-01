import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // ── 1. Verificar que el llamante es un admin autenticado ────
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !caller) return json({ ok: false, error: 'No autenticado' }, 401);

    // Verificar rol admin en consola_perfiles
    const { data: perfil } = await callerClient
      .from('consola_perfiles')
      .select('rol')
      .eq('id', caller.id)
      .single();

    if (perfil?.rol !== 'admin') return json({ ok: false, error: 'Sin permisos de administrador' }, 403);

    // ── 2. Leer payload ────────────────────────────────────────
    const { email: emailRaw, password, nombre, rol, procesos: procesosRaw, proceso, modulos: modulosRaw } = await req.json();
    const email = String(emailRaw ?? '').trim().toLowerCase();

    if (!email || !password) return json({ ok: false, error: 'Correo y contraseña son obligatorios' }, 400);

    const procesos: string[] = Array.isArray(procesosRaw)
      ? procesosRaw.map((p: unknown) => String(p).trim()).filter(Boolean)
      : (proceso ? [String(proceso).trim()] : []);
    const modulos: string[] = Array.isArray(modulosRaw) ? modulosRaw.map(String) : [];

    // ── 3. Crear usuario en Supabase Auth ─────────────────────
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // confirmar email automáticamente
      user_metadata: {
        nombre : nombre || email.split('@')[0],
        rol    : rol    || 'analista',
        proceso: procesos.join(', '),
      },
    });

    if (createErr) {
      // Usuario ya existe (el mensaje de Supabase cambió entre versiones; se valida también el código)
      const code = (createErr as { code?: string }).code;
      if (code === 'email_exists' || /already (been )?registered/i.test(createErr.message)) {
        return json({ ok: false, error: `El correo ${email} ya está registrado. Búsquelo en la lista y use "Editar".` }, 409);
      }
      if (code === 'weak_password' || /password/i.test(createErr.message)) {
        return json({ ok: false, error: `Contraseña no válida: ${createErr.message}` }, 400);
      }
      throw createErr;
    }

    // ── 4. El trigger handle_new_user crea consola_perfiles ───
    // Upsert explícito con rol, procesos y módulos
    const { error: upErr } = await adminClient.from('consola_perfiles').upsert({
      id      : newUser.user!.id,
      nombre  : nombre || email.split('@')[0],
      email,
      rol     : rol    || 'analista',
      proceso : procesos.join(', ') || null,
      procesos,
      modulos,
      activo  : true,
    }, { onConflict: 'id' });
    if (upErr) throw upErr;

    return json({ ok: true, id: newUser.user!.id, email });

  } catch (err) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
    return json({ ok: false, error: msg }, 500);
  }
});
