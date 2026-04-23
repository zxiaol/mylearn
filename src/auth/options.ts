import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/db/client";
import { verifyPassword } from "@/src/services/password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "username", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? "";
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.nickname };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error MVP: extend session user
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

