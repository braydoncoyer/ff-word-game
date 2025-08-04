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
    <div className="flex flex-col gap-1 sm:gap-2 select-none w-full max-w-xs sm:max-w-lg px-2">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
              className={`
                ${key === 'ENTER' || key === 'BACKSPACE' 
                  ? 'px-2 sm:px-3 py-3 sm:py-4 text-xs font-bold flex-1 max-w-12 sm:max-w-16' 
                  : 'w-8 h-10 sm:w-10 sm:h-12 text-xs sm:text-sm'
                }
                font-bold rounded uppercase transition-all duration-150
                ${disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 cursor-pointer'
                }
                border-0 shadow-sm hover:shadow-md active:shadow-sm
              `}
            >
              {key === 'BACKSPACE' ? '⌫' : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}