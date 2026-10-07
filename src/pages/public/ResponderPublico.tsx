import { useSearchParams } from 'react-router-dom'
import ResponderPqrsf from '../respuesta/ResponderPqrsf'

const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

// Respuesta de un PQRSF sin login: se abre desde el botón del correo de
// notificación (#/responder?r=<id>&t=<código único del reporte>).
export default function ResponderPublico() {
  const [params] = useSearchParams()
  const id = Number(params.get('r'))
  const token = params.get('t') ?? ''
  const valido = id > 0 && /^[0-9a-f-]{36}$/i.test(token)

  return (
    <div className="min-h-screen bg-[#E3E6EC]">
      <div className="bg-gradient-to-r from-[#0D2D6B] to-[#16468E] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 text-center">
          <img src={LOGO_BLANCO} alt="Clínica de Alta Complejidad Santa Bárbara" className="mx-auto h-14 object-contain drop-shadow-md" />
          <h1 className="mt-3 mb-1 text-xl font-extrabold">Registrar Respuesta PQRSF</h1>
          <p className="text-sm text-white/80">Sistema de Información y Atención al Usuario</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {valido ? (
          <ResponderPqrsf publico={{ id, token }} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Enlace no válido. Abra esta página desde el botón <b>"Responder PQRSF"</b> del correo de notificación del radicado.
          </div>
        )}
      </div>
    </div>
  )
}
