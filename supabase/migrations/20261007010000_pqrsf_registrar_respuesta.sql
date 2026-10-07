-- Registro de respuesta sin login: valida el código del radicado, inserta la
-- respuesta y marca el reporte como Respondida en una sola transacción.
create or replace function public.pqrsf_registrar_respuesta(p_id bigint, p_token uuid, p_respuesta jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_id integer;
begin
  if not exists (select 1 from reportes_pqrsf where id = p_id and token_respuesta = p_token) then
    raise exception 'Enlace no válido' using errcode = '28000';
  end if;
  if coalesce(trim(p_respuesta->>'respuesta'), '') = '' or coalesce(trim(p_respuesta->>'respondido_por_nombre'), '') = '' then
    raise exception 'La respuesta y el responsable son obligatorios' using errcode = '22023';
  end if;

  insert into respuestas_pqrsf (reporte_id, numero_radicado, fecha_respuesta, respuesta, colaborador,
                                respondido_por_nombre, respondido_por_email, archivo_url, archivo_nombre)
  values (p_id, 'PQRSF-' || lpad(p_id::text, 6, '0'),
          coalesce(nullif(p_respuesta->>'fecha_respuesta', '')::date, current_date),
          p_respuesta->>'respuesta', nullif(p_respuesta->>'colaborador', ''),
          p_respuesta->>'respondido_por_nombre', nullif(p_respuesta->>'respondido_por_email', ''),
          nullif(p_respuesta->>'archivo_url', ''), nullif(p_respuesta->>'archivo_nombre', ''))
  returning id into v_id;

  update reportes_pqrsf set estado = 'Respondida' where id = p_id;
  return v_id;
end $$;

revoke all on function public.pqrsf_registrar_respuesta(bigint, uuid, jsonb) from public;
grant execute on function public.pqrsf_registrar_respuesta(bigint, uuid, jsonb) to anon, authenticated;

-- Las respuestas solo se leen/escriben con sesión; sin login se usa pqrsf_registrar_respuesta.
drop policy if exists "allow_select" on public.respuestas_pqrsf;
drop policy if exists "allow_anon_insert" on public.respuestas_pqrsf;
create policy "auth_insert_respuestas" on public.respuestas_pqrsf
  for insert to authenticated with check (true);

-- Reemplazada por pqrsf_registrar_respuesta.
drop function if exists public.pqrsf_marcar_respondida(bigint, uuid);
