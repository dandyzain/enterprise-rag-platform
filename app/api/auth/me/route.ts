import { apiRoute } from "@/lib/api/route";
import { isAuthConfigured, isDemoLoginEnabled } from "@/lib/env";

export const GET = apiRoute(async (ctx) =>
  ctx.json(
    {
      success: true,
      user: ctx.actor.user,
      auth: { available: isAuthConfigured(), demoEnabled: isDemoLoginEnabled() && isAuthConfigured() },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
);
