import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client outside to avoid multiple instances in dev
const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Demo Account",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "demo" },
      },
      async authorize(credentials) {
        if (!credentials?.username) return null
        
        // Find or create demo user
        let user = await prisma.user.findFirst({
          where: { email: `${credentials.username}@demo.com` }
        })
        
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: credentials.username as string,
              email: `${credentials.username}@demo.com`,
            }
          })
        }
        
        return { id: user.id, name: user.name, email: user.email }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    }
  },
  session: { strategy: "jwt" }
})
