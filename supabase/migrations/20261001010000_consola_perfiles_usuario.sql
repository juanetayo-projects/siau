-- Usuarios que inician sesión con nombre de usuario (sin correo propio).
-- usuario: identificador de ingreso, único. correo_contacto: correo informativo, puede repetirse entre usuarios.
-- En auth.users estos usuarios tienen un correo técnico <usuario>@usuarios.siau.cacsantabarbara.co
alter table public.consola_perfiles
  add column if not exists usuario text,
  add column if not exists correo_contacto text;

create unique index if not exists consola_perfiles_usuario_key
  on public.consola_perfiles (lower(usuario)) where usuario is not null;
