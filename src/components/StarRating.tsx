import { RATING_COLORS } from '../lib/satisfaccion'

export default function StarRating({ value, onChange, disabled = false }: {
  value: number | null; onChange?: (v: number) => void; disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const color = RATING_COLORS[n]
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            className={`h-14 w-14 rounded-xl border-2 text-lg font-bold transition-all duration-150 ${
              selected
                ? `${color.bg} ${color.text} ${color.border} scale-110 shadow-lg`
                : 'border-gray-200 bg-white text-gray-400 hover:scale-105 hover:border-gray-400'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {n}
          </button>
        )
      })}
      {value && (
        <span className={`self-center rounded-full px-3 py-1 text-sm font-medium ${RATING_COLORS[value].bg} ${RATING_COLORS[value].text}`}>
          {RATING_COLORS[value].label}
        </span>
      )}
    </div>
  )
}
