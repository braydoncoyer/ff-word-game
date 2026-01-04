'use client'

interface KeyboardProps {
  onKeyPress: (key: string) => void
  disabled?: boolean
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
]

export function Keyboard({ onKeyPress, disabled = false }: KeyboardProps) {
  return (
    <div className="w-full py-6 px-4 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
      <div className="flex flex-col gap-2 select-none">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                disabled={disabled}
                className={`
                  key-editorial
                  ${key === 'ENTER' || key === 'BACKSPACE'
                    ? 'px-3 sm:px-4 md:px-5 text-xs sm:text-sm md:text-base flex-1 max-w-16 sm:max-w-18 md:max-w-20'
                    : 'w-10 sm:w-11 md:w-12 lg:w-14 text-sm sm:text-base md:text-lg'
                  }
                  h-10 sm:h-11 md:h-12 lg:h-14
                  uppercase flex items-center justify-center touch-manipulation rounded-sm
                `}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}