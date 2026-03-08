import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || "Abhishek Sharma"

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD first.")
    process.exit(1)
  }

  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.")
    process.exit(1)
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    console.error(`User already exists for ${email}. Refusing to overwrite.`)
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      provider: "LOCAL",
      role: "ADMIN",
    },
  })

  console.log(`Admin created: ${email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
