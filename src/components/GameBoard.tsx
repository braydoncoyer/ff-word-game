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
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
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
    const filledCount = currentGuess.filter((letter) => letter !== "").length;
    const word = currentGuess.join("").toLowerCase();

    if (
      filledCount === 5 &&
      !gameState?.completed &&
      !preValidationCache.has(word) &&
      !isPreValidating
    ) {
      preValidateWord(currentGuess);
    }
  }, [currentGuess, gameState?.completed]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--cream-bg)]">
        <div className="editorial-card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--newspaper-red)] mx-auto mb-4"></div>
          <p className="body-text font-bold">Loading today&apos;s puzzle...</p>
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
    setCurrentGuess((prev) => {
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
      className="flex flex-col items-center justify-start sm:justify-between outline-none h-screen max-h-screen overflow-hidden bg-[var(--cream-bg)] column-rules"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Top section with game content */}
      <div className="flex flex-col items-center gap-4 sm:gap-4 md:gap-6 w-full sm:flex-1 min-h-0 overflow-y-auto p-4 sm:p-4 md:p-6 py-6 sm:py-4">
        {/* Newspaper Masthead - Traditional Style */}
        <div className="text-center w-full max-w-4xl px-4 mb-3 sm:mb-4">
          {/* Tagline above title */}
          <p className="label-caps text-[0.6rem] sm:text-[0.65rem] mb-1 sm:mb-2 tracking-wider">
            Daily Word Challenge
          </p>

          {/* Title */}
          <h1 className="masthead-title text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-2 sm:mb-3">
            Frantic Five
          </h1>

          {/* Top Rule */}
          <div className="newspaper-rule-thick" />

          {/* Info Line - Three columns: Challenge (left), Guess (center), Vol/Date (right) */}
          <div className="masthead-info-line text-[0.6rem] sm:text-[0.65rem]">
            <span className="masthead-col-left hidden sm:inline">
              Daily Word Challenge
            </span>
            <span className="masthead-col-left sm:hidden">Challenge</span>
            {gameState.guesses.length > 0 ? (
              <span className="masthead-col-center">
                Guess {gameState.guesses.length}
              </span>
            ) : (
              <span className="masthead-col-center">—</span>
            )}
            <span className="masthead-col-right hidden sm:inline">
              Vol. 1, No.{" "}
              {Math.floor(
                (new Date().getTime() - new Date("2025-01-01").getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{" "}
              •{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="masthead-col-right sm:hidden">
              Vol. 1, No.{" "}
              {Math.floor(
                (new Date().getTime() - new Date("2025-01-01").getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}
            </span>
          </div>

          {/* Bottom Rule */}
          <div className="newspaper-rule-thick" />
        </div>

        <div className="flex flex-col gap-4 sm:gap-4 md:gap-6 w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-4xl px-2">
          {/* Top Word */}
          <div className="text-center">
            <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3">
              {Array.from(gameState.currentTop).map((letter, index) => (
                <div
                  key={index}
                  className={`tile-boundary ${
                    gameState.completed ? "tile-completed" : ""
                  } w-16 sm:w-12 md:w-16 lg:w-24 aspect-square rounded-md flex items-center justify-center text-2xl sm:text-xl md:text-2xl lg:text-4xl uppercase`}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Current Guess / Secret Word - Larger middle tiles */}
          <div className="text-center">
            <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3">
              {gameState.completed && gameState.secretWord
                ? // Show secret word when completed
                  Array.from(gameState.secretWord).map((letter, index) => (
                    <div
                      key={index}
                      className="tile-success w-[4.5rem] sm:w-14 md:w-22 lg:w-28 aspect-square rounded-md flex items-center justify-center text-3xl sm:text-xl md:text-3xl lg:text-4xl uppercase fade-in"
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
                        className={`${
                          letter ? "tile-guess" : "tile-empty"
                        } w-[4.5rem] sm:w-14 md:w-22 lg:w-28 aspect-square rounded-md flex items-center justify-center text-3xl sm:text-xl md:text-3xl lg:text-4xl uppercase ${
                          letter ? "cursor-pointer" : "cursor-default"
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
            <div className="flex justify-center gap-1.5 sm:gap-2 md:gap-3">
              {Array.from(gameState.currentBottom).map((letter, index) => (
                <div
                  key={index}
                  className={`tile-boundary ${
                    gameState.completed ? "tile-completed" : ""
                  } w-16 sm:w-12 md:w-16 lg:w-24 aspect-square rounded-md flex items-center justify-center text-2xl sm:text-xl md:text-2xl lg:text-4xl uppercase`}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && !gameState.completed && (
          <div className="text-center p-3 sm:p-4 max-w-lg border-2 border-[var(--newspaper-red)] bg-[var(--newspaper-red-light)] rounded-sm fade-in">
            <p className="body-text text-[var(--newspaper-red-dark)] font-semibold">
              {message}
            </p>
          </div>
        )}

        {isPending && (
          <div className="text-center caption-text font-semibold fade-in">
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

      {/* Bottom section - Keyboard or Completion State */}
      <div className="w-full flex justify-center flex-shrink-0">
        {!gameState.completed ? (
          <Keyboard onKeyPress={handleKeyPress} disabled={isPending} />
        ) : (
          <div className="w-full flex justify-center fade-in py-6 px-4">
            <div className="completion-box">
              {/* Top double rule */}
              <div className="newspaper-rule-thick mb-4" />

              {/* Headline */}
              <div
                className={`completion-headline text-xl sm:text-2xl text-left mb-4 ${
                  gameState.won ? "won" : ""
                }`}
              >
                You solved today&apos;s puzzle in {gameState.guesses.length}{" "}
                {gameState.guesses.length === 1 ? "guess" : "guesses"}!
              </div>

              {/* Thin separator */}
              <div className="newspaper-rule-thin mb-4" />

              {/* Statistics Table - Single Row */}
              <div className="stats-table">
                {/* Pattern Column */}
                <div className="stats-pattern">
                  <div className="stats-pattern-label">Pattern:</div>
                  <div className="stats-pattern-emojis">
                    {(gameState.guessDirections || []).map(
                      (direction, index) => {
                        switch (direction) {
                          case "up":
                            return <span key={index}>⬆️</span>;
                          case "down":
                            return <span key={index}>⬇️</span>;
                          case "win":
                            return <span key={index}>✅</span>;
                          default:
                            return <span key={index}>🔍</span>;
                        }
                      }
                    )}
                  </div>
                </div>

                {/* Share Button Column */}
                <div>
                  <ShareButton gameState={gameState} />
                </div>
              </div>

              {/* Bottom double rule */}
              <div className="newspaper-rule-thick mt-4" />
            </div>
          </div>
        )}
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

      {/* Printer's Marks - Newspaper Footer */}
      <div className="printers-mark text-center py-4">
        Established 2025 • Made by{" "}
        <a
          href="https://braydoncoyer.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--newspaper-red)] transition-colors duration-200"
        >
          Braydon
        </a>{" "}
        • All Rights Reserved
      </div>
    </div>
  );
}
