import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthService } from "@/lib/auth/auth-service";
import { readSessionCookie } from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";

export default async function Home() {
  const authService = new AuthService({ repository: new PrismaAuthRepository() });

  try {
    await authService.getSession(readSessionCookie(await cookies()));
  } catch {
    redirect("/login");
  }

  redirect("/dashboard");
}
