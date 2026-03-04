import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const DEMO_USER = {
  id: "demo-user-001",
  name: "Demo User",
  email: "demo@inmoai.es",
  role: "premium" as const,
};

const DEMO_PASSWORD = "Demo2026!";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = String(credentials?.email ?? "").trim().toLowerCase();
          const password = String(credentials?.password ?? "");

          console.log("[auth] authorize called", {
            emailReceived: email,
            emailExpected: DEMO_USER.email,
            emailMatch: email === DEMO_USER.email,
            passwordReceived: JSON.stringify(password),
            passwordExpected: JSON.stringify(DEMO_PASSWORD),
            passwordMatch: password === DEMO_PASSWORD,
            passwordLength: password.length,
            expectedLength: DEMO_PASSWORD.length,
            credentialKeys: credentials ? Object.keys(credentials) : [],
          });

          if (email === DEMO_USER.email && password === DEMO_PASSWORD) {
            return {
              id: DEMO_USER.id,
              name: DEMO_USER.name,
              email: DEMO_USER.email,
            };
          }

          return null;
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as typeof DEMO_USER).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as typeof DEMO_USER).role = token.role as "premium";
      }
      return session;
    },
  },
  trustHost: true,
});
