import { User } from "@prisma/client";

export function publicUser(
  user: Pick<User, "id" | "email" | "name" | "role" | "subscriptionStatus"> & {
    googleId?: string | null;
    passwordSet?: boolean;
  }
) {
  const isPremium = user.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE";
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    isPremium,
    googleLinked: Boolean(user.googleId),
    hasPassword: user.passwordSet !== false,
  };
}
