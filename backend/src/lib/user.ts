import { User } from "@prisma/client";

export function publicUser(user: Pick<User, "id" | "email" | "name" | "role" | "subscriptionStatus">) {
  const isPremium = user.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE";
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    isPremium,
  };
}
