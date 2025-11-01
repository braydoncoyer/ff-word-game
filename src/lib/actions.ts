'use server'

import { supabase } from '@/lib/db'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { wordList } from '@/lib/wordList'

export interface GameState {
  id: string
  currentTop: string
  currentBottom: string
  guesses: string[]
  guessDirections?: string[] // 'up' for moving top bound, 'down' for moving bottom bound, 'win' for correct guess
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

  // Dev mode: Allow date override for testing (only in non-production)
  if (process.env.NODE_ENV !== 'production' && process.env.TEST_PUZZLE_DATE) {
    const testDate = new Date(process.env.TEST_PUZZLE_DATE)
    if (!isNaN(testDate.getTime())) {
      today.setTime(testDate.getTime())
      console.log(`🧪 DEV MODE: Using test date ${process.env.TEST_PUZZLE_DATE}`)
    }
  }

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
  } else if (process.env.NODE_ENV !== 'production') {
    // Dev mode: Log secret word for existing puzzles
    // @ts-expect-error - secret_words is array but accessed as object
    const secretWord = puzzle?.secret_words?.word
    if (secretWord) {
      console.log(`🔐 Secret word (existing puzzle): ${secretWord}`)
    }
  }

  return puzzle ? {
    id: puzzle.id,
    date: puzzle.date,
    topWord: puzzle.topWord,
    bottomWord: puzzle.bottomWord
  } : null
}

async function generateDailyPuzzle(dateStr: string) {
  // Get unused secret words and find one with sufficient surrounding words
  const { data: secretWords, error: secretError } = await supabase
    .from('secret_words')
    .select('id, word')
    .eq('used', false)

  if (secretError || !secretWords || secretWords.length === 0) {
    throw new Error('No unused secret words available')
  }

  // Shuffle the secret words to ensure random selection across the alphabet
  const shuffledSecretWords = secretWords.sort(() => Math.random() - 0.5)

  // Find a secret word that has enough words before and after it
  let secretWord = null
  let allTopWords = null
  let allBottomWords = null

  for (const candidate of shuffledSecretWords) {
    const { data: topWords } = await supabase
      .from('dictionary')
      .select('word')
      .lt('word', candidate.word)
      .order('word', { ascending: false })
      .limit(1000)

    const { data: bottomWords } = await supabase
      .from('dictionary')
      .select('word')
      .gt('word', candidate.word)
      .order('word', { ascending: true })
      .limit(1000)

    // Need at least 100 words on each side to generate varied brackets
    if (topWords && topWords.length >= 100 && bottomWords && bottomWords.length >= 100) {
      secretWord = candidate
      allTopWords = topWords
      allBottomWords = bottomWords
      break
    }
  }

  if (!secretWord || !allTopWords || !allBottomWords) {
    throw new Error('No suitable secret words with enough surrounding words')
  }

  // Dev mode: Log the secret word for testing
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔐 Secret word: ${secretWord.word}`)
  }

  const secretFirstLetter = secretWord.word.charAt(0)
  const secretCharCode = secretFirstLetter.charCodeAt(0)

  // Function to find bracket words 2-4 letters away from secret word for optimal difficulty
  const findBracketWord = (words: {word: string}[], direction: 'before' | 'after') => {
    // Group words by first letter
    const wordsByLetter = new Map<string, {word: string}[]>()
    words.forEach(w => {
      const firstLetter = w.word.charAt(0)
      if (!wordsByLetter.has(firstLetter)) {
        wordsByLetter.set(firstLetter, [])
      }
      wordsByLetter.get(firstLetter)!.push(w)
    })

    // Define target letter range: 2-4 letters away from secret word
    const minOffset = 2
    const maxOffset = 4
    const targetLetters: string[] = []

    if (direction === 'before') {
      // For top word: 2-4 letters before the secret word (e.g., if secret is 'm', target 'i','j','k','l')
      for (let offset = minOffset; offset <= maxOffset; offset++) {
        const charCode = secretCharCode - offset
        if (charCode >= 97) { // 'a' = 97
          targetLetters.push(String.fromCharCode(charCode))
        }
      }
    } else {
      // For bottom word: 2-4 letters after the secret word (e.g., if secret is 'm', target 'n','o','p','q')
      for (let offset = minOffset; offset <= maxOffset; offset++) {
        const charCode = secretCharCode + offset
        if (charCode <= 122) { // 'z' = 122
          targetLetters.push(String.fromCharCode(charCode))
        }
      }
    }

    // Find available letters in the target range
    const availableTargetLetters = targetLetters.filter(letter => wordsByLetter.has(letter))

    if (availableTargetLetters.length > 0) {
      // Randomly select from target range
      const selectedLetter = availableTargetLetters[Math.floor(Math.random() * availableTargetLetters.length)]
      const wordsWithSelectedLetter = wordsByLetter.get(selectedLetter)!
      return wordsWithSelectedLetter[Math.floor(Math.random() * wordsWithSelectedLetter.length)].word
    }

    // Fallback: if no words in ideal range, pick from different first letter
    const availableLetters = Array.from(wordsByLetter.keys())
      .filter(letter => letter !== secretFirstLetter)

    if (availableLetters.length > 0) {
      const selectedLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)]
      const wordsWithSelectedLetter = wordsByLetter.get(selectedLetter)!
      return wordsWithSelectedLetter[Math.floor(Math.random() * wordsWithSelectedLetter.length)].word
    }

    // Final fallback: use any word
    return words[Math.floor(Math.random() * Math.min(words.length, 100))].word
  }

  const topWord = findBracketWord(allTopWords, 'before')
  const bottomWord = findBracketWord(allBottomWords, 'after')

  console.log(`🎮 Bracket: ${topWord} < ${secretWord.word} < ${bottomWord}`)
  console.log(`📏 Letter distances: ${secretFirstLetter.charCodeAt(0) - topWord.charAt(0).charCodeAt(0)} before, ${bottomWord.charAt(0).charCodeAt(0) - secretFirstLetter.charCodeAt(0)} after`)

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
    console.error('Failed to create daily puzzle:', puzzleError)
    throw new Error(`Failed to create daily puzzle: ${puzzleError.message}`)
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
    guessDirections: userGame.guessDirections,
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
    guessDirections: userGame.guessDirections,
    completed: userGame.completed,
    won: userGame.won,
    secretWord
  }
}

// Validate word without updating game state (for pre-validation)
export async function validateWord(guess: string): Promise<{
  success: boolean
  message: string
}> {
  // Validate guess is 5 letters
  if (guess.length !== 5) {
    return { success: false, message: 'Guess must be 5 letters' }
  }
  
  // Check if word exists in dictionary (Supabase) or wordList
  const guessLower = guess.toLowerCase()
  const isInWordList = wordList.includes(guessLower)
  
  let isValidWord = false
  if (isInWordList) {
    isValidWord = true
  } else {
    const { data: supabaseWord } = await supabase
      .from('dictionary')
      .select('word')
      .eq('word', guessLower)
      .single()
    
    isValidWord = !!supabaseWord
  }
  
  if (!isValidWord) {
    return { success: false, message: 'Word not in dictionary' }
  }
  
  return { success: true, message: 'Valid word' }
}

export async function submitGuess(guess: string, skipValidation = false): Promise<{
  success: boolean
  message: string
  newState?: GameState
}> {
  const guessLower = guess.toLowerCase()
  
  // Validate guess is 5 letters
  if (guess.length !== 5) {
    return { success: false, message: 'Guess must be 5 letters' }
  }
  
  // Skip dictionary validation if we already validated (from pre-validation)
  if (!skipValidation) {
    const validationResult = await validateWord(guess)
    if (!validationResult.success) {
      return validationResult
    }
  }
  
  // Start parallel operations
  const sessionId = await getOrCreateSessionId()
  const puzzlePromise = getTodaysPuzzle()
  
  // Set cookie if this is a new session (non-blocking)
  const cookieStore = await cookies()
  if (!cookieStore.get('sessionId')?.value) {
    setSessionCookie(sessionId) // Don't await this
  }
  
  const puzzle = await puzzlePromise
  if (!puzzle) {
    return { success: false, message: 'No puzzle available' }
  }
  
  // Fetch user game and secret word in parallel
  const [userGameResult, fullPuzzleResult] = await Promise.all([
    supabase
      .from('user_games')
      .select('*')
      .eq('sessionId', sessionId)
      .eq('dailyPuzzleId', puzzle.id)
      .single(),
    supabase
      .from('daily_puzzles')
      .select(`secret_words(word)`)
      .eq('id', puzzle.id)
      .single()
  ])
  
  const userGame = userGameResult.data
  const fullPuzzle = fullPuzzleResult.data
  
  if (!userGame) {
    return { success: false, message: 'Game not found' }
  }
  
  if (userGame.completed) {
    return { success: false, message: 'Game already completed' }
  }
  
  // @ts-expect-error - secret_words is array but accessed as object
  if (!fullPuzzle?.secret_words?.word) {
    return { success: false, message: 'Puzzle not found' }
  }
  
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
    const newDirections = [...(userGame.guessDirections || []), 'win']
    const { data: updatedGame, error } = await supabase
      .from('user_games')
      .update({
        guesses: [...userGame.guesses, guess],
        guessDirections: newDirections,
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
    
    return {
      success: true,
      message: 'Congratulations! You guessed the word!',
      newState: {
        id: updatedGame.id,
        currentTop: updatedGame.currentTop,
        currentBottom: updatedGame.currentBottom,
        guesses: updatedGame.guesses,
        guessDirections: updatedGame.guessDirections,
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
  let direction = ''
  
  if (guessLower < secretWord) {
    newTop = guessLower
    direction = 'up'
  } else if (guessLower > secretWord) {
    newBottom = guessLower
    direction = 'down'
  }
  
  const newDirections = [...(userGame.guessDirections || []), direction]
  
  const { data: updatedGame, error } = await supabase
    .from('user_games')
    .update({
      currentTop: newTop,
      currentBottom: newBottom,
      guesses: [...userGame.guesses, guess],
      guessDirections: newDirections,
      updatedAt: new Date().toISOString()
    })
    .eq('id', userGame.id)
    .select('*')
    .single()
  
  if (error) {
    return { success: false, message: 'Failed to update game' }
  }
  
  return {
    success: true,
    message: '',
    newState: {
      id: updatedGame.id,
      currentTop: updatedGame.currentTop,
      currentBottom: updatedGame.currentBottom,
      guesses: updatedGame.guesses,
      guessDirections: updatedGame.guessDirections,
      completed: updatedGame.completed,
      won: updatedGame.won
    }
  }
}