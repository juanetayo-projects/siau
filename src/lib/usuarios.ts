// Usuarios sin correo propio (p. ej. gestores que comparten un buzón): inician sesión con un
// nombre de usuario. En Supabase Auth se registran con un correo técnico en este dominio.
export const DOMINIO_USUARIOS = 'usuarios.siau.cacsantabarbara.co'
export const PATRON_USUARIO = /^[a-z0-9][a-z0-9._-]{2,39}$/

export function normalizarUsuario(v: string) {
  return v.trim().toLowerCase()
}

/** Convierte lo que el usuario escribe en el login ("correo" o "usuario") al correo de Auth. */
export function emailDeIngreso(v: string) {
  const t = normalizarUsuario(v)
  return t.includes('@') ? t : `${t}@${DOMINIO_USUARIOS}`
}

export function esCorreoTecnico(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith(`@${DOMINIO_USUARIOS}`)
}
