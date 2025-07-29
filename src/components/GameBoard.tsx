"use client";

import { useState, useTransition, useEffect } from "react";
import { submitGuess, initializeGame, type GameState } from "@/lib/actions";
import { Keyboard } from "./Keyboard";

interface GameBoardProps {
  initialState: GameState | null;
}

export function GameBoard({ initialState }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(initialState);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

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
      className="flex flex-col items-center gap-6 p-4 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Frantic Five</h1>
        <p className="text-gray-600">
          Guess the word between the top and bottom words!
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {/* Top Word */}
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Top</div>
          <div className="text-2xl font-mono uppercase tracking-wider bg-red-100 border-2 border-red-300 rounded-lg py-3 px-4">
            {gameState.currentTop}
          </div>
        </div>

        {/* Current Guess */}
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Your Guess</div>
          <div className="text-2xl font-mono uppercase tracking-wider bg-blue-100 border-2 border-blue-300 rounded-lg py-3 px-4 min-h-[60px] flex items-center justify-center">
            {currentGuess.padEnd(5, "_")}
          </div>
        </div>

        {/* Bottom Word */}
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Bottom</div>
          <div className="text-2xl font-mono uppercase tracking-wider bg-green-100 border-2 border-green-300 rounded-lg py-3 px-4">
            {gameState.currentBottom}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`text-center p-3 rounded-lg ${
            gameState.won
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Game completed state */}
      {gameState.completed && (
        <div className="text-center">
          {gameState.won && gameState.secretWord && (
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
              <div className="text-lg font-semibold text-green-800 mb-2">
                🎉 Congratulations! 🎉
              </div>
              <div className="text-sm text-green-700">
                The secret word was:{" "}
                <span className="font-mono font-bold uppercase">
                  {gameState.secretWord}
                </span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                You solved it in {gameState.guesses.length} guess
                {gameState.guesses.length !== 1 ? "es" : ""}!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Guesses */}
      {gameState.guesses.length > 0 && (
        <div className="w-full max-w-md">
          <div className="text-sm text-gray-500 mb-2">Previous Guesses</div>
          <div className="flex flex-wrap gap-2">
            {gameState.guesses.map((guess, index) => (
              <div
                key={index}
                className="text-sm font-mono uppercase bg-gray-100 border border-gray-300 rounded px-2 py-1"
              >
                {guess}
              </div>
            ))}
          </div>
        </div>
      )}

      <Keyboard
        onKeyPress={handleKeyPress}
        disabled={isPending || gameState.completed}
      />

      {isPending && (
        <div className="text-center text-gray-500">Checking your guess...</div>
      )}
    </div>
  );
}
