import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Debe coincidir con src/lib/usuarios.ts
const DOMINIO_USUARIOS = 'usuarios.siau.cacsantabarbara.co';
const PATRON_USUARIO   = /^[a-z0-9][a-z0-9._-]{2,39}$/;

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

    const body = await req.json();
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Acción: restablecer contraseña (la asigna el administrador) ──
    if (body.action === 'reset_password') {
      const { id, password } = body;
      if (!id || !password || String(password).length < 6) {
        return json({ ok: false, error: 'La contraseña debe tener mínimo 6 caracteres.' }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(id, { password: String(password) });
      if (error) return json({ ok: false, error: `No se pudo restablecer: ${error.message}` }, 400);
      return json({ ok: true });
    }

    // ── 2. Leer payload de creación ────────────────────────────
    const { password, nombre, rol, procesos: procesosRaw, proceso, modulos: modulosRaw } = body;
    const usuario = body.usuario ? String(body.usuario).trim().toLowerCase() : '';
    const correoContacto = body.correo_contacto ? String(body.correo_contacto).trim().toLowerCase() : '';

    let email = String(body.email ?? '').trim().toLowerCase();
    if (usuario) {
      if (!PATRON_USUARIO.test(usuario)) {
        return json({ ok: false, error: 'Usuario no válido: use de 3 a 40 caracteres (letras minúsculas, números, punto, guion o guion bajo), sin espacios.' }, 400);
      }
      const { data: existe } = await adminClient.from('consola_perfiles').select('id').ilike('usuario', usuario).maybeSingle();
      if (existe) return json({ ok: false, error: `El usuario ${usuario} ya existe.` }, 409);
      email = `${usuario}@${DOMINIO_USUARIOS}`;
    }

    if (!email || !password) return json({ ok: false, error: 'Correo (o usuario) y contraseña son obligatorios' }, 400);

    const procesos: string[] = Array.isArray(procesosRaw)
      ? procesosRaw.map((p: unknown) => String(p).trim()).filter(Boolean)
      : (proceso ? [String(proceso).trim()] : []);
    const modulos: string[] = Array.isArray(modulosRaw) ? modulosRaw.map(String) : [];

    // ── 3. Crear usuario en Supabase Auth ─────────────────────
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // confirmar email automáticamente
      user_metadata: {
        nombre : nombre || usuario || email.split('@')[0],
        rol    : rol    || 'analista',
        proceso: procesos.join(', '),
      },
    });

    if (createErr) {
      // Usuario ya existe (el mensaje de Supabase cambió entre versiones; se valida también el código)
      const code = (createErr as { code?: string }).code;
      if (code === 'email_exists' || /already (been )?registered/i.test(createErr.message)) {
        return json({ ok: false, error: usuario
          ? `El usuario ${usuario} ya existe.`
          : `El correo ${email} ya está registrado. Si varias personas comparten este correo, cree cada una con "Nombre de usuario".` }, 409);
      }
      if (code === 'weak_password' || /password/i.test(createErr.message)) {
        return json({ ok: false, error: `Contraseña no válida: ${createErr.message}` }, 400);
      }
      throw createErr;
    }

    // ── 4. El trigger handle_new_user crea consola_perfiles ───
    // Upsert explícito con rol, procesos, módulos y datos de usuario
    const { error: upErr } = await adminClient.from('consola_perfiles').upsert({
      id             : newUser.user!.id,
      nombre         : nombre || usuario || email.split('@')[0],
      email,
      usuario        : usuario || null,
      correo_contacto: correoContacto || null,
      rol            : rol    || 'analista',
      proceso        : procesos.join(', ') || null,
      procesos,
      modulos,
      activo         : true,
    }, { onConflict: 'id' });
    if (upErr) throw upErr;

    return json({ ok: true, id: newUser.user!.id, email });

  } catch (err) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
    return json({ ok: false, error: msg }, 500);
  }
});
