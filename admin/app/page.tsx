import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthService } from "@/lib/auth/auth-service";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";

export default async function Home() {
  const authService = new AuthService({ repository: new PrismaAuthRepository() });

  try {
    await authService.getSession((await cookies()).get("admin_session")?.value ?? null);
  } catch {
    redirect("/login");
  }

  redirect("/dashboard");
}
