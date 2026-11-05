-- Varios documentos adjuntos por respuesta: las respuestas extensas se soportan
-- con archivos en lugar de seguir ampliando el texto de la respuesta oficial.
-- archivo_url / archivo_nombre se conservan para las respuestas históricas.
alter table public.respuestas_pqrsf
  add column if not exists adjuntos jsonb not null default '[]'::jsonb;

alter table public.respuestas_pqrsf
  drop constraint if exists respuestas_pqrsf_adjuntos_es_lista;
alter table public.respuestas_pqrsf
  add constraint respuestas_pqrsf_adjuntos_es_lista check (jsonb_typeof(adjuntos) = 'array');

-- Igual a la versión anterior, guardando además la lista de adjuntos.
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
                                respondido_por_nombre, respondido_por_email, archivo_url, archivo_nombre, adjuntos)
  values (p_id, 'PQRSF-' || lpad(p_id::text, 6, '0'),
          coalesce(nullif(p_respuesta->>'fecha_respuesta', '')::date, current_date),
          p_respuesta->>'respuesta', nullif(p_respuesta->>'colaborador', ''),
          p_respuesta->>'respondido_por_nombre', nullif(p_respuesta->>'respondido_por_email', ''),
          nullif(p_respuesta->>'archivo_url', ''), nullif(p_respuesta->>'archivo_nombre', ''),
          case when jsonb_typeof(p_respuesta->'adjuntos') = 'array' then p_respuesta->'adjuntos' else '[]'::jsonb end)
  returning id into v_id;

  update reportes_pqrsf set estado = 'Respondida' where id = p_id;
  return v_id;
end $$;
