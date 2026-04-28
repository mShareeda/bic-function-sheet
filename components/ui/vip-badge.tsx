import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function VipBadge({
  size = "sm",
  className,
}: {
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizeClass =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5 gap-1"
      : size === "md"
      ? "text-sm px-2.5 py-1 gap-1.5"
      : "text-xs px-2 py-0.5 gap-1.5";
  const iconClass =
    size === "xs" ? "h-2.5 w-2.5" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wider whitespace-nowrap",
        "bg-gradient-to-br from-vip to-vip/80 text-vip-foreground",
        "shadow-sm ring-1 ring-vip/40",
        sizeClass,
        className,
      )}
    >
      <Crown className={cn("shrink-0", iconClass)} />
      VIP
    </span>
  );
}
