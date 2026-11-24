"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { StatusPage } from "@/components/ui/status-page";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <StatusPage kind="error" onRetry={() => retry()} digest={error.digest} />;
}
