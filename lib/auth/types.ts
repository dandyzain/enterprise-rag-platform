export type UserRole = "ADMIN" | "MEMBER" | "GUEST";
export type UserPlan = "FREE" | "PRO" | "ENTERPRISE";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: UserPlan;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}
