const { execSync } = require('child_process')

try {
  console.log('Running seed script with tsx...')
  execSync('npx tsx src/lib/seed.ts', { stdio: 'inherit' })
  console.log('Seed completed successfully!')
} catch (error) {
  console.error('Seed script failed:', error)
  process.exit(1)
}