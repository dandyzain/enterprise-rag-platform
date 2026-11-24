import { resetMemoryStore } from "@/lib/db";
import { resetMemoryRateLimits } from "@/lib/ratelimit";

export function resetAll() {
  resetMemoryStore();
  resetMemoryRateLimits();
}
