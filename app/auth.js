import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        // This function runs when someone tries to log in
        // It checks if the email and password are correct

        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find the user in the database by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // If no user found, return null (login fails)
        if (!user) {
          return null
        }

        // Compare the entered password with the stored encrypted password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )

        // If password doesn't match, return null (login fails)
        if (!passwordMatch) {
          return null
        }

        // If everything is correct, return the user (login succeeds)
        return {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          hostel: user.hostel,
          roomNo: user.roomNo,
        }
      },
    }),
  ],

  callbacks: {
    // This runs when a session token is created
    // We add extra user info to the token so we can access it anywhere
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.nickname = user.nickname
        token.hostel = user.hostel
        token.roomNo = user.roomNo
      }
      return token
    },

    // This runs when we access the session
    // We copy the token info into the session so our pages can use it
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.nickname = token.nickname
        session.user.hostel = token.hostel
        session.user.roomNo = token.roomNo
      }
      return session
    },
  },

  pages: {
    signIn: '/login', // Our custom login page
  },

  session: {
    strategy: 'jwt', // Store session in a token, not the database
  },

  secret: process.env.NEXTAUTH_SECRET,
})
