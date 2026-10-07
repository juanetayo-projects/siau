-- Acceso sin login a la respuesta de un PQRSF mediante enlace con código único.
alter table public.reportes_pqrsf
  add column if not exists token_respuesta uuid not null default gen_random_uuid();
create unique index if not exists reportes_pqrsf_token_respuesta_key on public.reportes_pqrsf (token_respuesta);

-- Lee un reporte solo si el código coincide (no permite enumerar radicados).
create or replace function public.pqrsf_reporte_por_token(p_id bigint, p_token uuid)
returns setof public.reportes_pqrsf
language sql stable security definer set search_path = public as $$
  select * from public.reportes_pqrsf where id = p_id and token_respuesta = p_token;
$$;

-- Marca el reporte como respondido, también validando el código.
create or replace function public.pqrsf_marcar_respondida(p_id bigint, p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.reportes_pqrsf set estado = 'Respondida'
   where id = p_id and token_respuesta = p_token;
  return found;
end $$;

revoke all on function public.pqrsf_reporte_por_token(bigint, uuid) from public;
revoke all on function public.pqrsf_marcar_respondida(bigint, uuid) from public;
grant execute on function public.pqrsf_reporte_por_token(bigint, uuid) to anon, authenticated;
grant execute on function public.pqrsf_marcar_respondida(bigint, uuid) to anon, authenticated;
