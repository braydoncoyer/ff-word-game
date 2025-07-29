const { seedDatabase } = require('../src/lib/seed.ts')

async function main() {
  try {
    await seedDatabase()
    process.exit(0)
  } catch (error) {
    console.error('Seed script failed:', error)
    process.exit(1)
  }
}

main()