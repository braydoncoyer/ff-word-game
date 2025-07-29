'use server'

import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from 'next/cache'

export interface GameState {
  id: string
  currentTop: string
  currentBottom: string
  guesses: string[]
  completed: boolean
  won: boolean
  secretWord?: string
}

export interface DailyPuzzleData {
  id: string
  date: string
  topWord: string
  bottomWord: string
  secretWord: string
}

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('sessionId')?.value
  
  if (!sessionId) {
    sessionId = uuidv4()
    cookieStore.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })
  }
  
  return sessionId
}

export async function getTodaysPuzzle(): Promise<DailyPuzzleData | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let puzzle = await prisma.dailyPuzzle.findUnique({
    where: { date: today },
    include: { secretWord: true }
  })
  
  if (!puzzle) {
    // Generate today's puzzle
    puzzle = await generateDailyPuzzle(today)
  }
  
  return puzzle ? {
    id: puzzle.id,
    date: puzzle.date.toISOString(),
    topWord: puzzle.topWord,
    bottomWord: puzzle.bottomWord,
    secretWord: puzzle.secretWord.word
  } : null
}

async function generateDailyPuzzle(date: Date) {
  // Get an unused secret word
  const secretWord = await prisma.secretWord.findFirst({
    where: { used: false }
  })
  
  if (!secretWord) {
    throw new Error('No unused secret words available')
  }
  
  // Generate top and bottom words that bracket the secret word alphabetically
  const topWords = await prisma.dictionary.findMany({
    where: { word: { lt: secretWord.word } },
    orderBy: { word: 'desc' },
    take: 10
  })
  
  const bottomWords = await prisma.dictionary.findMany({
    where: { word: { gt: secretWord.word } },
    orderBy: { word: 'asc' },
    take: 10
  })
  
  if (topWords.length === 0 || bottomWords.length === 0) {
    throw new Error('Cannot generate bracket words for secret word')
  }
  
  const topWord = topWords[Math.floor(Math.random() * Math.min(topWords.length, 5))].word
  const bottomWord = bottomWords[Math.floor(Math.random() * Math.min(bottomWords.length, 5))].word
  
  // Create the puzzle and mark secret word as used
  const [puzzle] = await Promise.all([
    prisma.dailyPuzzle.create({
      data: {
        date,
        secretWordId: secretWord.id,
        topWord,
        bottomWord
      },
      include: { secretWord: true }
    }),
    prisma.secretWord.update({
      where: { id: secretWord.id },
      data: { used: true, usedDate: new Date() }
    })
  ])
  
  return puzzle
}

export async function getUserGameState(): Promise<GameState | null> {
  const sessionId = await getOrCreateSessionId()
  const puzzle = await getTodaysPuzzle()
  
  if (!puzzle) return null
  
  const userGame = await prisma.userGame.findUnique({
    where: {
      sessionId_dailyPuzzleId: {
        sessionId,
        dailyPuzzleId: puzzle.id
      }
    }
  })
  
  if (!userGame) {
    // Create new game state
    const newGame = await prisma.userGame.create({
      data: {
        sessionId,
        dailyPuzzleId: puzzle.id,
        currentTop: puzzle.topWord,
        currentBottom: puzzle.bottomWord,
        guesses: []
      }
    })
    
    return {
      id: newGame.id,
      currentTop: newGame.currentTop,
      currentBottom: newGame.currentBottom,
      guesses: newGame.guesses,
      completed: newGame.completed,
      won: newGame.won
    }
  }
  
  return {
    id: userGame.id,
    currentTop: userGame.currentTop,
    currentBottom: userGame.currentBottom,
    guesses: userGame.guesses,
    completed: userGame.completed,
    won: userGame.won,
    secretWord: userGame.completed ? puzzle.secretWord : undefined
  }
}

export async function submitGuess(guess: string): Promise<{
  success: boolean
  message: string
  newState?: GameState
}> {
  const sessionId = await getOrCreateSessionId()
  const puzzle = await getTodaysPuzzle()
  
  if (!puzzle) {
    return { success: false, message: 'No puzzle available' }
  }
  
  // Validate guess is 5 letters
  if (guess.length !== 5) {
    return { success: false, message: 'Guess must be 5 letters' }
  }
  
  // Check if word exists in dictionary
  const isValidWord = await prisma.dictionary.findUnique({
    where: { word: guess.toLowerCase() }
  })
  
  if (!isValidWord) {
    return { success: false, message: 'Word not in dictionary' }
  }
  
  const userGame = await prisma.userGame.findUnique({
    where: {
      sessionId_dailyPuzzleId: {
        sessionId,
        dailyPuzzleId: puzzle.id
      }
    }
  })
  
  if (!userGame) {
    return { success: false, message: 'Game not found' }
  }
  
  if (userGame.completed) {
    return { success: false, message: 'Game already completed' }
  }
  
  const guessLower = guess.toLowerCase()
  const secretWord = puzzle.secretWord.toLowerCase()
  const currentTop = userGame.currentTop.toLowerCase()
  const currentBottom = userGame.currentBottom.toLowerCase()
  
  // Check if guess is correct
  if (guessLower === secretWord) {
    const updatedGame = await prisma.userGame.update({
      where: { id: userGame.id },
      data: {
        guesses: [...userGame.guesses, guess],
        completed: true,
        won: true
      }
    })
    
    revalidatePath('/')
    
    return {
      success: true,
      message: 'Congratulations! You guessed the word!',
      newState: {
        id: updatedGame.id,
        currentTop: updatedGame.currentTop,
        currentBottom: updatedGame.currentBottom,
        guesses: updatedGame.guesses,
        completed: updatedGame.completed,
        won: updatedGame.won,
        secretWord: puzzle.secretWord
      }
    }
  }
  
  // Update bounds based on alphabetical comparison
  let newTop = currentTop
  let newBottom = currentBottom
  
  if (guessLower < secretWord) {
    newTop = guessLower
  } else if (guessLower > secretWord) {
    newBottom = guessLower
  }
  
  const updatedGame = await prisma.userGame.update({
    where: { id: userGame.id },
    data: {
      currentTop: newTop,
      currentBottom: newBottom,
      guesses: [...userGame.guesses, guess]
    }
  })
  
  revalidatePath('/')
  
  return {
    success: true,
    message: guessLower < secretWord ? 'Too low! Try higher.' : 'Too high! Try lower.',
    newState: {
      id: updatedGame.id,
      currentTop: updatedGame.currentTop,
      currentBottom: updatedGame.currentBottom,
      guesses: updatedGame.guesses,
      completed: updatedGame.completed,
      won: updatedGame.won
    }
  }
}