import { getUserGameState } from '@/lib/actions'
import { GameBoard } from '@/components/GameBoard'
import { Suspense } from 'react'

function LoadingGame() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading today's puzzle...</p>
      </div>
    </div>
  )
}

async function Game() {
  const gameState = await getUserGameState()
  
  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Game Unavailable</h1>
          <p className="text-gray-600">Unable to load today's puzzle. Please try again later.</p>
        </div>
      </div>
    )
  }
  
  return <GameBoard initialState={gameState} />
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingGame />}>
        <Game />
      </Suspense>
    </div>
  )
}
