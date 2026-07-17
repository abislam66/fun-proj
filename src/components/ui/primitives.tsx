import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

function join(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="wordmark" href="/" aria-label="TuEats home">
      <span>Tu</span>
      <span className="wordmark-accent">Eats</span>
      {!compact ? <span className="wordmark-dot" aria-hidden="true" /> : null}
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
  return <input className={join("input", className)} {...props} />;
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
