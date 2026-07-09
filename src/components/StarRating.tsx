import { RATING_COLORS } from '../lib/satisfaccion'

export default function StarRating({ value, onChange, disabled = false }: {
  value: number | null; onChange?: (v: number) => void; disabled?: boolean
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const color = RATING_COLORS[n]
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(n)}
              className={`aspect-square w-full rounded-xl border-2 text-base sm:text-lg font-bold transition-all duration-150 ${
                selected
                  ? `${color.bg} ${color.text} ${color.border} scale-105 shadow-lg`
                  : 'border-gray-200 bg-white text-gray-400 hover:scale-105 hover:border-gray-400'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      {value && (
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${RATING_COLORS[value].bg} ${RATING_COLORS[value].text}`}>
          {RATING_COLORS[value].label}
        </span>
      )}
    </div>
  )
}
