"use client";

// No React imports needed for this component

interface InstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Instructions({ isOpen, onClose }: InstructionsProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overscroll-none"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onTouchMove={(e) => {
        // Prevent scrolling on touch devices
        e.preventDefault();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">How to Play</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-gray-700">
            <p className="text-base sm:text-lg font-semibold text-orange-600">
              Welcome to Frantic Five!
            </p>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">The Rules:</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  Find the secret word that comes alphabetically between the top
                  and bottom words.
                </li>
                <li>Each guess must be a valid 5-letter word.</li>
                <li>
                  Wrong guesses will replace either the top or bottom word,
                  narrowing your range.
                </li>
                <li>A new word is available every day!</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Example:</h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex justify-center gap-1">
                  {Array.from("APPLE").map((letter, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-gray-300 rounded flex items-center justify-center text-xs sm:text-sm font-bold bg-white"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* <p className="text-center text-xs text-gray-600">
                  (Your guess goes here)
                </p> */}

                <div className="flex justify-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-gray-300 rounded flex items-center justify-center text-xs sm:text-sm font-bold bg-gray-50"
                    ></div>
                  ))}
                </div>

                <div className="flex justify-center gap-1">
                  {Array.from("CHAIR").map((letter, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-gray-300 rounded flex items-center justify-center text-xs sm:text-sm font-bold bg-white"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                <p className="text-center text-xs sm:text-sm text-gray-600 mt-4 sm:mt-6 text-balance">
                  The secret word is between <b>APPLE</b> and <b>CHAIR</b>{" "}
                  alphabetically!
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Tips:</h3>
              <ul className="space-y-1 list-disc list-inside text-xs sm:text-sm">
                <li>
                  Think alphabetically - like looking up words in a dictionary
                </li>
                <li>Each wrong guess narrows down the range</li>
                <li>Use the keyboard or type to make guesses</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hidden sm:flex fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center text-xl font-bold z-40"
      title="How to Play"
    >
      ?
    </button>
  );
}
