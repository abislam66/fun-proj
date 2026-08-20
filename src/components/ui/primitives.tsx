import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

function join(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="TuEats home">
      <span>Tu</span>
      <span className="wordmark-accent">Eats</span>
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={join("button", `button-${variant}`, className)}
      type={type}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  // Password-manager / form-autofill browser extensions inject attributes
  // like `fdprocessedid` onto inputs before React hydrates, which React
  // then reports as a hydration mismatch. It's a real mismatch (the
  // extension really did mutate the DOM), but not a bug in this app —
  // suppress just this node's own-attribute warnings, not its subtree.
  return (
    <input
      className={join("input", className)}
      suppressHydrationWarning
      {...props}
    />
  );
}

export function Chip({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={join("chip", active && "chip-active")}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title = "No places match",
  description = "Try removing a filter or searching for something else.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">
        /
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
