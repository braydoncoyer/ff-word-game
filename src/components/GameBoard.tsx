"use client";

import { useState, useTransition, useEffect } from "react";
import {
  submitGuess,
  validateWord,
  initializeGame,
  type GameState,
} from "@/lib/actions";
import { Keyboard } from "./Keyboard";
import { ShareButton } from "./ShareButton";
import { Instructions, HelpButton } from "./Instructions";

interface GameBoardProps {
  initialState: GameState | null;
}

export function GameBoard({ initialState }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialState);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(5).fill(""));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);
  const [preValidationCache, setPreValidationCache] = useState<
    Map<string, { isValid: boolean; message: string }>
  >(new Map());
  const [isPreValidating, setIsPreValidating] = useState(false);

  // Check if user has seen instructions before
  useEffect(() => {
    const seen = localStorage.getItem("frantic-five-instructions-seen");
    if (seen) {
      setHasSeenInstructions(true);
    } else {
      // Show instructions for first-time players
      setShowInstructions(true);
    }
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showInstructions) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showInstructions]);

  // Initialize game if no initial state
  useEffect(() => {
    if (!gameState) {
      startTransition(async () => {
        const initialized = await initializeGame();
        if (initialized) {
          setGameState(initialized);
        }
      });
    }
  }, [gameState]);

  // Clear cache when game state changes
  useEffect(() => {
    setPreValidationCache(new Map());
  }, [gameState?.id]);

  // Pre-validate when currentGuess reaches 5 letters
  useEffect(() => {
    const filledCount = currentGuess.filter(letter => letter !== "").length;
    const word = currentGuess.join("").toLowerCase();
    
    if (filledCount === 5 && !gameState?.completed && !preValidationCache.has(word) && !isPreValidating) {
      preValidateWord(currentGuess);
    }
  }, [currentGuess, gameState?.completed]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading today&apos;s puzzle...</p>
        </div>
      </div>
    );
  }

  // Pre-validate word when 5 letters are entered
  const preValidateWord = async (guessArray: string[]) => {
    const word = guessArray.join("").toLowerCase();
    if (
      word.length !== 5 ||
      preValidationCache.has(word) ||
      isPreValidating ||
      gameState?.completed
    ) {
      return;
    }

    setIsPreValidating(true);
    try {
      // Only validate word existence, don't update game state
      const validationResult = await validateWord(word);

      // Cache the validation result (success or failure)
      // We'll still need to call submitGuess on Enter, but at least we know if the word is valid
      setPreValidationCache(
        (prev) =>
          new Map(
            prev.set(word, {
              isValid: validationResult.success,
              message: validationResult.message,
            })
          )
      );
    } catch (error) {
      console.error("Pre-validation failed:", error);
      // Don't cache failed requests
    } finally {
      setIsPreValidating(false);
    }
  };

  const handleTileClick = (index: number) => {
    if (gameState.completed) return;
    
    // Remove the letter at the clicked position
    setCurrentGuess(prev => {
      const newGuess = [...prev];
      newGuess[index] = "";
      return newGuess;
    });
    setMessage("");
  };

  const handleKeyPress = (key: string) => {
    if (gameState.completed) return;

    if (key === "ENTER") {
      const wordString = currentGuess.join("").toLowerCase();
      if (wordString.length === 5) {
        startTransition(async () => {
          // Check if we have a cached validation result
          const cachedValidation = preValidationCache.get(wordString);

          if (cachedValidation && !cachedValidation.isValid) {
            // If we know the word is invalid, show error immediately
            setMessage(cachedValidation.message);
            // Clear the cache entry
            setPreValidationCache((prev) => {
              const newCache = new Map(prev);
              newCache.delete(wordString);
              return newCache;
            });
          } else {
            // Word is valid or not cached - proceed with full submission
            // Skip validation if we already validated it
            const skipValidation = cachedValidation?.isValid === true;
            const result = await submitGuess(wordString, skipValidation);
            // Only show message if there's an error
            if (!result.success) {
              setMessage(result.message);
            } else {
              setMessage(""); // Clear any previous messages
            }
            if (result.success && result.newState) {
              setGameState(result.newState);
              setCurrentGuess(Array(5).fill(""));
            }
            // Clear the entire cache after submission
            setPreValidationCache(new Map());
          }
        });
      } else {
        setMessage("Word must be 5 letters");
      }
    } else if (key === "BACKSPACE") {
      // Find the rightmost filled position and clear it
      setCurrentGuess((prev) => {
        const newGuess = [...prev];
        for (let i = newGuess.length - 1; i >= 0; i--) {
          if (newGuess[i] !== "") {
            newGuess[i] = "";
            break;
          }
        }
        return newGuess;
      });
      setMessage("");
    } else if (key.length === 1) {
      // Find the leftmost empty position and fill it
      setCurrentGuess((prev) => {
        const newGuess = [...prev];
        for (let i = 0; i < newGuess.length; i++) {
          if (newGuess[i] === "") {
            newGuess[i] = key.toLowerCase();
            break;
          }
        }
        return newGuess;
      });
      setMessage("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleKeyPress("ENTER");
    } else if (event.key === "Backspace") {
      handleKeyPress("BACKSPACE");
    } else if (/^[a-zA-Z]$/.test(event.key)) {
      handleKeyPress(event.key.toUpperCase());
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-between p-3 sm:p-4 md:p-6 outline-none h-screen max-h-screen overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Top section with game content */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6 w-full flex-1 min-h-0 overflow-y-auto">
        <div className="text-center space-y-2">
          <h1
            className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 md:mb-4 ${
              gameState.completed ? "text-gray-500" : "text-gray-900"
            }`}
          >
            Frantic Five
          </h1>
          <p
            className={`text-sm sm:text-base md:text-lg font-medium px-2 ${
              gameState.completed ? "text-gray-400" : "text-gray-700"
            }`}
          >
            Guess the word between the top and bottom words
          </p>

          {/* Guess Counter */}
          <div
            className={`text-xs sm:text-sm md:text-base font-semibold ${
              gameState.completed ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {gameState.guesses.length > 0 && (
              <span>Guess {gameState.guesses.length}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl px-2">
          {/* Top Word */}
          <div className="text-center">
            <div className="flex justify-center gap-2 md:gap-3">
              {Array.from(gameState.currentTop).map((letter, index) => (
                <div
                  key={index}
                  className={`w-10 sm:w-12 md:w-16 lg:w-18 aspect-square border-2 rounded-lg flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase ${
                    gameState.completed
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300 bg-white text-gray-900"
                  }`}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Current Guess / Secret Word */}
          <div className="text-center">
            <div className="flex justify-center gap-2 md:gap-3">
              {gameState.completed && gameState.secretWord
                ? // Show secret word when completed
                  Array.from(gameState.secretWord).map((letter, index) => (
                    <div
                      key={index}
                      className="w-12 sm:w-14 md:w-18 lg:w-20 aspect-square border-2 border-emerald-600 bg-emerald-500 rounded-lg flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase text-white shadow-lg"
                    >
                      {letter}
                    </div>
                  ))
                : // Show current guess when playing
                  currentGuess.map((letter, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => handleTileClick(index)}
                        disabled={gameState.completed}
                        className={`w-12 sm:w-14 md:w-18 lg:w-20 aspect-square border-2 rounded-lg flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase transition-colors ${
                          letter
                            ? "border-gray-500 bg-white text-gray-900 hover:bg-gray-100 cursor-pointer"
                            : "border-gray-300 bg-gray-50 text-gray-400 cursor-default"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Bottom Word */}
          <div className="text-center">
            <div className="flex justify-center gap-2 md:gap-3">
              {Array.from(gameState.currentBottom).map((letter, index) => (
                <div
                  key={index}
                  className={`w-10 sm:w-12 md:w-16 lg:w-18 aspect-square border-2 rounded-lg flex items-center justify-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase ${
                    gameState.completed
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300 bg-white text-gray-900"
                  }`}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && !gameState.completed && (
          <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg font-semibold text-xs sm:text-sm md:text-base max-w-lg bg-red-100 text-red-800 border border-red-200">
            {message}
          </div>
        )}

        {/* Game completed state */}
        {gameState.completed && (
          <div className="text-center space-y-4 sm:space-y-6 w-full max-w-sm sm:max-w-md md:max-w-lg">
            {gameState.won ? (
              <div className="space-y-2 sm:space-y-4">
                <div className="text-base sm:text-lg md:text-xl font-bold text-emerald-600">
                  🎉 Congratulations! 🎉
                </div>
                <div className="text-xs sm:text-sm md:text-base text-gray-600">
                  Solved in {gameState.guesses.length} guess
                  {gameState.guesses.length !== 1 ? "es" : ""}!
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                <div className="text-base sm:text-lg md:text-xl font-bold text-gray-600">
                  😞 Better luck next time!
                </div>
                <div className="text-xs sm:text-sm md:text-base text-gray-500">
                  Used all {gameState.guesses.length} guesses.
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <ShareButton gameState={gameState} />
            </div>
          </div>
        )}

        {isPending && (
          <div className="text-center text-gray-700 font-semibold text-xs sm:text-sm md:text-base">
            Checking your guess...
          </div>
        )}
      </div>

      {/* Previous Guesses */}
      {/* {gameState.guesses.length > 0 && (
        <div className="w-full max-w-md">
          <div className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
            Previous Guesses
          </div>
          <div className="flex flex-wrap gap-2">
            {gameState.guesses.map((guess, index) => (
              <div
                key={index}
                className="text-sm font-bold uppercase bg-gray-200 border border-gray-400 rounded-md px-3 py-2 text-gray-900"
              >
                {guess}
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Bottom section with keyboard */}
      <div className="w-full flex justify-center pb-2 sm:pb-3 md:pb-4 flex-shrink-0">
        <Keyboard
          onKeyPress={handleKeyPress}
          disabled={isPending || gameState.completed}
        />
      </div>

      <Instructions
        isOpen={showInstructions}
        onClose={() => {
          setShowInstructions(false);
          if (!hasSeenInstructions) {
            localStorage.setItem("frantic-five-instructions-seen", "true");
            setHasSeenInstructions(true);
          }
        }}
      />

      <HelpButton onClick={() => setShowInstructions(true)} />
    </div>
  );
}
