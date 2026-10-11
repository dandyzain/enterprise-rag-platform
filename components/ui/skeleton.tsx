import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-zinc-200/70 dark:bg-zinc-800/60 shimmer-mask",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
