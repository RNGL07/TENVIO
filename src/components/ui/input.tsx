import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full bg-white border border-sand text-ink placeholder-fade/60 rounded-lg px-3.5 py-2.5",
        "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/60",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full bg-white border border-sand text-ink placeholder-fade/60 rounded-lg px-3.5 py-2.5",
        "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/60",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-semibold uppercase tracking-wide mb-1.5 text-fade", className)}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}
