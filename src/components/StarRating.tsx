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
              className={`aspect-square w-full rounded-xl text-base sm:text-lg font-bold transition-all duration-150 ${
                selected
                  ? `${color.bg} ${color.text} neu-btn-pressed scale-105`
                  : 'neu-btn bg-white text-gray-400 hover:scale-105'
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
