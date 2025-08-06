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
    <div className="bg-white rounded-t-3xl pt-6 pb-4 px-4 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto shadow-2xl">
      <div className="flex flex-col gap-2 sm:gap-2 md:gap-3 select-none w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2 sm:gap-2 md:gap-2">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={disabled}
              className={`
                ${key === 'ENTER' || key === 'BACKSPACE' 
                  ? 'px-3 sm:px-3 md:px-4 text-xs sm:text-sm md:text-base font-semibold flex-1 max-w-18 sm:max-w-16 md:max-w-20' 
                  : 'w-10 sm:w-10 md:w-12 lg:w-14 text-sm sm:text-sm md:text-base lg:text-lg'
                }
                h-10 sm:h-10 md:h-12 lg:h-14
                font-semibold rounded-lg uppercase transition-all duration-200
                ${disabled
                  ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                  : 'bg-[#EFF3F6] text-[#717377] hover:bg-gray-200 active:bg-gray-300 cursor-pointer active:scale-95'
                }
                border-0 shadow-sm hover:shadow-md active:shadow-inner flex items-center justify-center touch-manipulation
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