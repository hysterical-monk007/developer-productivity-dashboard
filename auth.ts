import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

const HAS_GITHUB_OAUTH =
  Boolean(process.env.GITHUB_CLIENT_ID) &&
  Boolean(process.env.GITHUB_CLIENT_SECRET);

export const authConfig: NextAuthConfig = {
  providers: HAS_GITHUB_OAUTH
    ? [
        GitHub({
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          authorization: {
            params: {
              scope: "read:user user:email repo read:org",
            },
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token + login on first sign-in
      if (account?.provider === "github" && account.access_token) {
        (token as Record<string, unknown>).accessToken = account.access_token;
      }
      if (profile) {
        const p = profile as {
          login?: string;
          name?: string | null;
          avatar_url?: string;
          bio?: string | null;
        };
        if (p.login) (token as Record<string, unknown>).login = p.login;
        if (p.name) token.name = p.name;
        if (p.avatar_url) token.picture = p.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      (session as unknown as { accessToken?: string }).accessToken =
        typeof t.accessToken === "string" ? t.accessToken : undefined;
      if (session.user && typeof t.login === "string") {
        (session.user as { login?: string }).login = t.login;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: { strategy: "jwt" },
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
export const HAS_OAUTH = HAS_GITHUB_OAUTH;
