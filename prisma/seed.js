require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  const ownerPassword = await bcrypt.hash('catalyst', 10)

  const owner = await prisma.user.upsert({
    where: { email: 'sethcheyzcky@gmail.com' },
    update: {},
    create: {
      email: 'sethcheyzcky@gmail.com',
      password: ownerPassword,
      nickname: 'Owner',
      role: 'OWNER',
    },
  })

  console.log('✅ Owner account created:', owner.email)

  const products = [
    {
      name: 'Chapati',
      description: 'Soft, freshly made chapati',
      price: 15,
      available: true,
    },
    {
      name: 'Mandazi',
      description: 'Fluffy deep fried mandazi, 3 pieces',
      price: 20,
      available: true,
    },
    {
      name: 'Chapati + Egg',
      description: 'Chapati served with a fried egg',
      price: 35,
      available: true,
    },
    {
      name: 'Fries',
      description: 'Crispy french fries, served hot',
      price: 50,
      available: true,
    },
    {
      name: 'Fries + Egg',
      description: 'Crispy fries topped with a fried egg',
      price: 65,
      available: true,
    },
    {
      name: 'Mandazi + Tea',
      description: 'Mandazi served with a cup of tea',
      price: 40,
      available: true,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    })
    console.log('✅ Product created:', product.name)
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })