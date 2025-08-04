"use client";

import { useState, useTransition, useEffect } from "react";
import { submitGuess, initializeGame, type GameState } from "@/lib/actions";
import { Keyboard } from "./Keyboard";
import { ShareButton } from "./ShareButton";
import { Instructions, HelpButton } from "./Instructions";

interface GameBoardProps {
  initialState: GameState | null;
}

export function GameBoard({ initialState }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialState);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);

  // Check if user has seen instructions before
  useEffect(() => {
    const seen = localStorage.getItem('frantic-five-instructions-seen');
    if (seen) {
      setHasSeenInstructions(true);
    } else {
      // Show instructions for first-time players
      setShowInstructions(true);
    }
  }, []);

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

  const handleKeyPress = (key: string) => {
    if (gameState.completed) return;

    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        startTransition(async () => {
          const result = await submitGuess(currentGuess);
          setMessage(result.message);

          if (result.success && result.newState) {
            setGameState(result.newState);
            setCurrentGuess("");
          }
        });
      } else {
        setMessage("Word must be 5 letters");
      }
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
      setMessage("");
    } else if (key.length === 1 && currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + key.toLowerCase());
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
      className="flex flex-col items-center gap-4 sm:gap-6 p-3 sm:p-4 outline-none min-h-screen"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900">Frantic Five</h1>
        <p className="text-sm sm:text-base text-gray-700 font-medium px-2">
          Guess the word between the top and bottom words
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-sm sm:max-w-md px-2">
        {/* Top Word */}
        <div className="text-center">
          <div className="flex justify-center gap-1">
            {Array.from(gameState.currentTop).map((letter, index) => (
              <div
                key={index}
                className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-gray-300 rounded-md flex items-center justify-center text-xl sm:text-2xl font-bold uppercase bg-white text-gray-900"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Current Guess */}
        <div className="text-center">
          <div className="flex justify-center gap-1">
            {Array.from({ length: 5 }, (_, index) => {
              const letter = currentGuess[index] || "";
              return (
                <div
                  key={index}
                  className={`w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-md flex items-center justify-center text-xl sm:text-2xl font-bold uppercase ${
                    letter
                      ? "border-gray-500 bg-white text-gray-900"
                      : "border-gray-300 bg-gray-50 text-gray-400"
                  }`}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Word */}
        <div className="text-center">
          <div className="flex justify-center gap-1">
            {Array.from(gameState.currentBottom).map((letter, index) => (
              <div
                key={index}
                className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-gray-300 rounded-md flex items-center justify-center text-xl sm:text-2xl font-bold uppercase bg-white text-gray-900"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`text-center p-3 rounded-lg font-semibold text-sm sm:text-base ${
            gameState.won
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Game completed state */}
      {gameState.completed && (
        <div className="text-center space-y-4 w-full max-w-sm sm:max-w-md">
          {gameState.won && gameState.secretWord && (
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 sm:p-4">
              <div className="text-base sm:text-lg font-bold text-green-800 mb-2">
                🎉 Congratulations! 🎉
              </div>
              <div className="text-xs sm:text-sm font-semibold text-green-700">
                The secret word was:{" "}
                <span className="font-mono font-bold uppercase text-green-900">
                  {gameState.secretWord}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-green-700 mt-2">
                You solved it in {gameState.guesses.length} guess
                {gameState.guesses.length !== 1 ? "es" : ""}!
              </div>
            </div>
          )}
          
          {!gameState.won && (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 sm:p-4">
              <div className="text-base sm:text-lg font-bold text-red-800 mb-2">
                😞 Better luck next time!
              </div>
              <div className="text-xs sm:text-sm font-semibold text-red-700">
                The secret word was:{" "}
                <span className="font-mono font-bold uppercase text-red-900">
                  {gameState.secretWord}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-red-700 mt-2">
                You used all {gameState.guesses.length} guesses.
              </div>
            </div>
          )}
          
          <ShareButton gameState={gameState} />
        </div>
      )}

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

      <Keyboard
        onKeyPress={handleKeyPress}
        disabled={isPending || gameState.completed}
      />

      {isPending && (
        <div className="text-center text-gray-700 font-semibold text-sm sm:text-base">
          Checking your guess...
        </div>
      )}

      <Instructions
        isOpen={showInstructions}
        onClose={() => {
          setShowInstructions(false);
          if (!hasSeenInstructions) {
            localStorage.setItem('frantic-five-instructions-seen', 'true');
            setHasSeenInstructions(true);
          }
        }}
      />

      <HelpButton onClick={() => setShowInstructions(true)} />
    </div>
  );
}
