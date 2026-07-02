"use client";
export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-foreground text-background px-4 py-2 text-sm shadow-lg z-50">
      {msg}
    </div>
  );
}
