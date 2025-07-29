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
    <div className="flex flex-col gap-2 select-none">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
              className={`
                ${key === 'ENTER' || key === 'BACKSPACE' 
                  ? 'px-4 py-3 text-sm' 
                  : 'w-10 h-10 text-lg'
                }
                font-semibold rounded-md border-2 transition-colors
                ${disabled
                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100 active:bg-gray-200 cursor-pointer'
                }
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