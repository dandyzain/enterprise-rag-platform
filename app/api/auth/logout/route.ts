import { db } from "@/lib/db";
import { apiRoute } from "@/lib/api/route";
import { clearSessionCookie } from "@/lib/auth/session";

/**
 * Sign out. For real accounts the session version is bumped, which revokes
 * every token issued for the account (all devices), not just this cookie.
 */
export const POST = apiRoute(async (ctx) => {
  const user = ctx.actor.user;
  if (user && !user.isDemo) {
    await db.bumpSessionVersion(user.id);
  }
  const res = ctx.json({ success: true, message: ctx.t("LOGOUT_SUCCESS") });
  clearSessionCookie(res);
  return res;
});
