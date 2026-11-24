export type UserRole = "ADMIN" | "MEMBER" | "GUEST";
export type UserPlan = "FREE" | "PRO" | "ENTERPRISE";

/** The user object exposed to the client and used for authorization decisions. */
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: UserPlan;
  avatarUrl?: string;
  createdAt?: string;
  /** True for the sandboxed demo profiles (Admin / Member / Guest). */
  isDemo?: boolean;
}

/** A persisted account (never sent to the client as-is). */
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  plan: UserPlan;
  sessionVersion: number;
  createdAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}
