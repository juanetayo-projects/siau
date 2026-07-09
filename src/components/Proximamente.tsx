import { PageHeader } from './ui'

export default function Proximamente({ titulo, subtitulo, origen }: { titulo: string; subtitulo?: string; origen?: string }) {
  return (
    <div>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-4xl">🚧</p>
        <p className="mt-3 font-semibold text-[#0D2D6B]">Módulo en construcción dentro de SIAU</p>
        {origen && (
          <p className="mt-1 text-sm text-slate-500">
            Por ahora, esta función sigue disponible en <span className="font-mono">{origen}</span> mientras se porta nativamente.
          </p>
        )}
      </div>
    </div>
  )
}
