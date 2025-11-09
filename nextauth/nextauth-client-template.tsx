/*
Client-side template for using NextAuth in a React app (Next.js or other React app).
Place SessionProvider at the root of your app (e.g., pages/_app.tsx for Next.js).

Example usage:
- Wrap your app with <SessionProvider session={pageProps.session}>
- On login page call signIn('credentials', { email, password, redirect: false })
- Use useSession() to get current session and user

Notes:
- This file is a template demonstrating the usage. Do not import it automatically unless
  you've installed next-auth and set up the API route.

Install: npm i next-auth
*/

import React from "react";
import { SessionProvider, signIn, useSession } from "next-auth/react";

export function NextAuthProviderWrapper({ children, session }: any) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

// Example login helper
export async function credentialsSignIn(email: string, password: string) {
  const res: any = await signIn("credentials", {
    redirect: false,
    email,
    password,
  });
  return res;
}

// Example hook usage in a component
export function ExampleUserInfo() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;
  return (
    <div>
      Signed in as: {(session as any).user?.email}
      <pre>{JSON.stringify(session.user, null, 2)}</pre>
    </div>
  );
}
