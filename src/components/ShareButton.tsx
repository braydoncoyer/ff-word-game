"use client";

import { useState } from "react";
import { GameState } from "@/lib/actions";

interface ShareButtonProps {
  gameState: GameState;
}

function generateShareText(gameState: GameState): string {
  // Calculate puzzle number from date (days since launch)
  const today = new Date();
  const launchDate = new Date("2025-07-29"); // Adjust this to your actual launch date
  const daysSinceLaunch = Math.floor(
    (today.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const puzzleNumber = daysSinceLaunch + 1;

  // Format date
  const dateStr = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const guessCount = gameState.guesses.length;

  // Create directional emoji representation based on guess directions
  const directionEmojis = (gameState.guessDirections || [])
    .map((direction) => {
      switch (direction) {
        case "up":
          return "⬆️"; // Guess moved top bound up
        case "down":
          return "⬇️"; // Guess moved bottom bound down
        case "win":
          return "✅"; // Winning guess
        default:
          return "🔍"; // Fallback
      }
    })
    .join(" ");

  // Fallback for older games without direction tracking
  const progressDisplay = directionEmojis || "🔍".repeat(guessCount);

  const result = gameState.won ? "Solved" : "Unsolved";
  const resultEmoji = gameState.won ? "🎯" : "🤔";

  return `Frantic Five #${puzzleNumber} 📅 ${dateStr}

${progressDisplay}

${result} in ${guessCount} ${
    guessCount === 1 ? "guess" : "guesses"
  }! ${resultEmoji}

Play at franticfive.com`;
}

export function ShareButton({ gameState }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareText = generateShareText(gameState);

    try {
      if (navigator.share && /mobile/i.test(navigator.userAgent)) {
        // Use native sharing on mobile
        await navigator.share({
          title: "Frantic Five",
          text: shareText,
        });
      } else {
        // Copy to clipboard on desktop
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardError) {
        console.error("Failed to copy:", clipboardError);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
    >
      {copied ? (
        <>
          ✅ <span>Copied!</span>
        </>
      ) : (
        <>
          📋 <span>Share Result</span>
        </>
      )}
    </button>
  );
}
