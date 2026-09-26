import { compare, hash } from "bcryptjs";

export const BCRYPT_COST = 12;

/**
 * 固定的 bcrypt 哈希，仅用于“用户不存在”时执行一次等价开销的 dummy compare，
 * 降低通过响应时序推断账号是否存在的风险。它从不与任何真实账号关联。
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$k6fJ.G9fYXIxM.8Ulifoh.VNdNdKuqabKTfKkGlqj0U/OO0dtxpIm";

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function performDummyPasswordCheck(password: string): Promise<void> {
  await compare(password, DUMMY_PASSWORD_HASH);
}
