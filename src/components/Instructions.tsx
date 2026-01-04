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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overscroll-none"
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
      <div className="glass-editorial rounded-sm max-w-sm sm:max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-[var(--border-dark)]">
            <h2 className="subheadline text-2xl sm:text-3xl">
              How to Play
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--charcoal-medium)] hover:text-[var(--charcoal)] text-3xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <p className="body-text font-semibold">
              Welcome to Frantic Five!
            </p>

            <div>
              <h3 className="body-text font-bold mb-2">The Rules:</h3>
              <ul className="space-y-2 list-disc list-inside body-text">
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
              <h3 className="body-text font-bold mb-2">Example:</h3>
              <div className="bg-[var(--cream-light)] border border-[var(--border-light)] rounded-sm p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex justify-center gap-1">
                  {Array.from("APPLE").map((letter, index) => (
                    <div
                      key={index}
                      className="tile-boundary w-6 h-6 sm:w-8 sm:h-8 rounded-sm flex items-center justify-center text-xs sm:text-sm"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                <div className="flex justify-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="tile-empty w-6 h-6 sm:w-8 sm:h-8 rounded-sm flex items-center justify-center text-xs sm:text-sm"
                    ></div>
                  ))}
                </div>

                <div className="flex justify-center gap-1">
                  {Array.from("CHAIR").map((letter, index) => (
                    <div
                      key={index}
                      className="tile-boundary w-6 h-6 sm:w-8 sm:h-8 rounded-sm flex items-center justify-center text-xs sm:text-sm"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                <p className="text-center caption-text mt-4 sm:mt-6 text-balance">
                  The secret word is between <strong>APPLE</strong> and <strong>CHAIR</strong>{" "}
                  alphabetically!
                </p>
              </div>
            </div>

            <div>
              <h3 className="body-text font-bold mb-2">Tips:</h3>
              <ul className="space-y-1 list-disc list-inside caption-text">
                <li>
                  Think alphabetically - like looking up words in a dictionary
                </li>
                <li>Each wrong guess narrows down the range</li>
                <li>Use the keyboard or type to make guesses</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[var(--border-light)] flex justify-end">
            <button
              onClick={onClose}
              className="btn-newspaper py-2 px-6 rounded-sm"
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
      className="hidden sm:flex fixed bottom-6 right-6 w-12 h-12 btn-newspaper rounded-sm items-center justify-center text-xl font-bold z-40 border-2 border-[var(--newspaper-red-dark)]"
      title="How to Play"
    >
      ?
    </button>
  );
}
