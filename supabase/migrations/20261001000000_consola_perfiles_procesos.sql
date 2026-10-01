-- Permite asociar un usuario de consola a varios procesos.
-- Se conserva la columna "proceso" (texto) por compatibilidad; la app la mantiene con los nombres unidos por ", ".
alter table public.consola_perfiles
  add column if not exists procesos text[] not null default '{}';

update public.consola_perfiles
set procesos = array[trim(proceso)]
where proceso is not null and trim(proceso) <> '' and procesos = '{}';
