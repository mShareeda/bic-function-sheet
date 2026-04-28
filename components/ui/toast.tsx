"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (input: { kind?: ToastKind; title: string; description?: string }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ kind = "info", title, description }) => {
      setItems((prev) => [
        ...prev,
        { id: ++nextId, kind, title, description },
      ]);
    },
    [],
  );

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4200}>
        {children}
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onClose={() => remove(item.id)} />
        ))}
        <ToastPrimitive.Viewport
          className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

const KIND_CLASS: Record<ToastKind, string> = {
  success: "border-l-4 border-l-status-live",
  error: "border-l-4 border-l-destructive",
  info: "border-l-4 border-l-status-confirmed",
};

const KIND_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const KIND_ICON_CLASS: Record<ToastKind, string> = {
  success: "text-status-live",
  error: "text-destructive",
  info: "text-status-confirmed",
};

function ToastItem({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const Icon = KIND_ICON[item.kind];
  return (
    <ToastPrimitive.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={cn(
        "glass-strong group relative flex items-start gap-3 rounded-md p-4 pr-10",
        "data-[state=open]:animate-fade-in-up data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
        KIND_CLASS[item.kind],
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", KIND_ICON_CLASS[item.kind])} />
      <div className="min-w-0 flex-1">
        <ToastPrimitive.Title className="text-sm font-semibold leading-tight">
          {item.title}
        </ToastPrimitive.Title>
        {item.description && (
          <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
            {item.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className="focus-ring absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
