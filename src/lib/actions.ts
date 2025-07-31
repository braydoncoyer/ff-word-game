'use server'

import { supabase } from '@/lib/db'
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
}

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('sessionId')?.value
  
  if (!sessionId) {
    sessionId = uuidv4()
    // Note: Cookie will be set in the server action when needed
  }
  
  return sessionId
}

async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies()
  cookieStore.set('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  })
}

export async function getTodaysPuzzle(): Promise<DailyPuzzleData | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
  
  // Check if today's puzzle exists
  const { error } = await supabase
    .from('daily_puzzles')
    .select(`
      id,
      date,
      topWord,
      bottomWord,
      secret_words(word)
    `)
    .eq('date', todayStr)
    .single()
  
  let { data: puzzle } = await supabase
    .from('daily_puzzles')
    .select(`
      id,
      date,
      topWord,
      bottomWord,
      secret_words(word)
    `)
    .eq('date', todayStr)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching puzzle:', error)
    return null
  }
  
  if (!puzzle) {
    // Generate today's puzzle
    // @ts-expect-error - puzzle type mismatch after generation
    puzzle = await generateDailyPuzzle(todayStr)
  }
  
  return puzzle ? {
    id: puzzle.id,
    date: puzzle.date,
    topWord: puzzle.topWord,
    bottomWord: puzzle.bottomWord
  } : null
}

async function generateDailyPuzzle(dateStr: string) {
  // Get an unused secret word
  const { data: secretWords, error: secretError } = await supabase
    .from('secret_words')
    .select('id, word')
    .eq('used', false)
    .limit(1)
  
  if (secretError || !secretWords || secretWords.length === 0) {
    throw new Error('No unused secret words available')
  }
  
  const secretWord = secretWords[0]
  
  // Generate top and bottom words that bracket the secret word alphabetically
  // Get all words from dictionary to ensure maximum variety
  const { data: allTopWords } = await supabase
    .from('dictionary')
    .select('word')
    .lt('word', secretWord.word)
    .order('word', { ascending: false })
  
  const { data: allBottomWords } = await supabase
    .from('dictionary')
    .select('word')
    .gt('word', secretWord.word)
    .order('word', { ascending: true })
  
  if (!allTopWords || allTopWords.length === 0 || !allBottomWords || allBottomWords.length === 0) {
    throw new Error('Cannot generate bracket words for secret word')
  }
  
  const secretFirstLetter = secretWord.word.charAt(0)
  
  // Function to find words with different first letters, prioritizing distance
  const findVariedWord = (words: {word: string}[], preferDirection: 'before' | 'after') => {
    // Group words by first letter
    const wordsByLetter = new Map<string, {word: string}[]>()
    words.forEach(w => {
      const firstLetter = w.word.charAt(0)
      if (!wordsByLetter.has(firstLetter)) {
        wordsByLetter.set(firstLetter, [])
      }
      wordsByLetter.get(firstLetter)!.push(w)
    })
    
    // Get letters different from secret word's first letter
    const availableLetters = Array.from(wordsByLetter.keys())
      .filter(letter => letter !== secretFirstLetter)
      .sort()
    
    if (availableLetters.length === 0) {
      // Fallback: use any available word
      return words[Math.floor(Math.random() * Math.min(words.length, 100))].word
    }
    
    // Prefer letters that are further away alphabetically
    let targetLetters: string[]
    if (preferDirection === 'before') {
      // For top word, prefer letters that come before the secret word's first letter
      targetLetters = availableLetters.filter(letter => letter < secretFirstLetter)
      if (targetLetters.length === 0) targetLetters = availableLetters
    } else {
      // For bottom word, prefer letters that come after the secret word's first letter  
      targetLetters = availableLetters.filter(letter => letter > secretFirstLetter)
      if (targetLetters.length === 0) targetLetters = availableLetters
    }
    
    // Select a random letter from the preferred ones
    const selectedLetter = targetLetters[Math.floor(Math.random() * targetLetters.length)]
    const wordsWithSelectedLetter = wordsByLetter.get(selectedLetter)!
    
    // Return a random word from that letter group
    return wordsWithSelectedLetter[Math.floor(Math.random() * wordsWithSelectedLetter.length)].word
  }
  
  const topWord = findVariedWord(allTopWords, 'before')
  const bottomWord = findVariedWord(allBottomWords, 'after')
  
  // Create the puzzle
  const { data: puzzle, error: puzzleError } = await supabase
    .from('daily_puzzles')
    .insert({
      date: dateStr,
      secretWordId: secretWord.id,
      topWord,
      bottomWord
    })
    .select(`
      id,
      date,
      topWord,
      bottomWord
    `)
    .single()
  
  if (puzzleError) {
    throw new Error('Failed to create daily puzzle')
  }
  
  // Mark secret word as used
  await supabase
    .from('secret_words')
    .update({ 
      used: true, 
      usedDate: new Date().toISOString() 
    })
    .eq('id', secretWord.id)
  
  return puzzle
}

export async function initializeGame(): Promise<GameState | null> {
  const sessionId = await getOrCreateSessionId()
  const puzzle = await getTodaysPuzzle()
  
  if (!puzzle) return null
  
  // Set cookie for new sessions
  const cookieStore = await cookies()
  if (!cookieStore.get('sessionId')?.value) {
    await setSessionCookie(sessionId)
  }
  
  // Check if user game exists
  let { data: userGame } = await supabase
    .from('user_games')
    .select('*')
    .eq('sessionId', sessionId)
    .eq('dailyPuzzleId', puzzle.id)
    .single()
  
  if (!userGame) {
    // Create new game state
    const { data: newGame, error } = await supabase
      .from('user_games')
      .insert({
        sessionId,
        dailyPuzzleId: puzzle.id,
        currentTop: puzzle.topWord,
        currentBottom: puzzle.bottomWord,
        guesses: []
      })
      .select('*')
      .single()
    
    if (error) {
      console.error('Error creating user game:', error)
      return null
    }
    
    userGame = newGame
  }
  
  // Get secret word only if game is completed
  let secretWord: string | undefined
  if (userGame.completed) {
    const { data: fullPuzzle } = await supabase
      .from('daily_puzzles')
      .select(`
        secret_words(word)
      `)
      .eq('id', puzzle.id)
      .single()
    
    // @ts-expect-error - secret_words is array but accessed as object
    secretWord = fullPuzzle?.secret_words?.word
  }

  return {
    id: userGame.id,
    currentTop: userGame.currentTop,
    currentBottom: userGame.currentBottom,
    guesses: userGame.guesses,
    completed: userGame.completed,
    won: userGame.won,
    secretWord
  }
}

export async function getUserGameState(): Promise<GameState | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('sessionId')?.value
  
  if (!sessionId) {
    return null // Let the client initialize
  }
  
  const puzzle = await getTodaysPuzzle()
  if (!puzzle) return null
  
  const { data: userGame } = await supabase
    .from('user_games')
    .select('*')
    .eq('sessionId', sessionId)
    .eq('dailyPuzzleId', puzzle.id)
    .single()
  
  if (!userGame) {
    return null // Let the client initialize
  }
  
  // Get secret word only if game is completed
  let secretWord: string | undefined
  if (userGame.completed) {
    const { data: fullPuzzle } = await supabase
      .from('daily_puzzles')
      .select(`
        secret_words(word)
      `)
      .eq('id', puzzle.id)
      .single()
    
    // @ts-expect-error - secret_words is array but accessed as object
    secretWord = fullPuzzle?.secret_words?.word
  }

  return {
    id: userGame.id,
    currentTop: userGame.currentTop,
    currentBottom: userGame.currentBottom,
    guesses: userGame.guesses,
    completed: userGame.completed,
    won: userGame.won,
    secretWord
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
  
  // Set cookie if this is a new session
  const cookieStore = await cookies()
  if (!cookieStore.get('sessionId')?.value) {
    await setSessionCookie(sessionId)
  }
  
  // Validate guess is 5 letters
  if (guess.length !== 5) {
    return { success: false, message: 'Guess must be 5 letters' }
  }
  
  // Check if word exists in dictionary
  const { data: isValidWord } = await supabase
    .from('dictionary')
    .select('word')
    .eq('word', guess.toLowerCase())
    .single()
  
  if (!isValidWord) {
    return { success: false, message: 'Word not in dictionary' }
  }
  
  // Get user game
  const { data: userGame } = await supabase
    .from('user_games')
    .select('*')
    .eq('sessionId', sessionId)
    .eq('dailyPuzzleId', puzzle.id)
    .single()
  
  if (!userGame) {
    return { success: false, message: 'Game not found' }
  }
  
  if (userGame.completed) {
    return { success: false, message: 'Game already completed' }
  }
  
  // Get the secret word from the database
  const { data: fullPuzzle } = await supabase
    .from('daily_puzzles')
    .select(`
      secret_words(word)
    `)
    .eq('id', puzzle.id)
    .single()
  
  // @ts-expect-error - secret_words is array but accessed as object
  if (!fullPuzzle?.secret_words?.word) {
    return { success: false, message: 'Puzzle not found' }
  }
  
  const guessLower = guess.toLowerCase()
  // @ts-expect-error - secret_words is array but accessed as object
  const secretWord = fullPuzzle.secret_words.word.toLowerCase()
  const currentTop = userGame.currentTop.toLowerCase()
  const currentBottom = userGame.currentBottom.toLowerCase()
  
  // Validate guess is within current bounds
  if (guessLower <= currentTop) {
    return { 
      success: false, 
      message: `Your guess must come after "${currentTop.toUpperCase()}" alphabetically` 
    }
  }
  
  if (guessLower >= currentBottom) {
    return { 
      success: false, 
      message: `Your guess must come before "${currentBottom.toUpperCase()}" alphabetically` 
    }
  }
  
  // Check if guess is correct
  if (guessLower === secretWord) {
    const { data: updatedGame, error } = await supabase
      .from('user_games')
      .update({
        guesses: [...userGame.guesses, guess],
        completed: true,
        won: true,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userGame.id)
      .select('*')
      .single()
    
    if (error) {
      return { success: false, message: 'Failed to update game' }
    }
    
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
        // @ts-expect-error - secret_words is array but accessed as object
        secretWord: fullPuzzle.secret_words.word
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
  
  const { data: updatedGame, error } = await supabase
    .from('user_games')
    .update({
      currentTop: newTop,
      currentBottom: newBottom,
      guesses: [...userGame.guesses, guess],
      updatedAt: new Date().toISOString()
    })
    .eq('id', userGame.id)
    .select('*')
    .single()
  
  if (error) {
    return { success: false, message: 'Failed to update game' }
  }
  
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