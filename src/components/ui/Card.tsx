import {
  forwardRef,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
} from "react";
import { cn } from "./cn";

type BaseCardProps = {
  interactive?: boolean;
  className?: string;
};

export type CardProps =
  | (BaseCardProps & { interactive?: false; href?: never } & HTMLAttributes<HTMLDivElement>)
  | (BaseCardProps & { interactive: true; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | (BaseCardProps & { interactive: true; href?: never } & ButtonHTMLAttributes<HTMLButtonElement>);

const BASE_CLASSES = "rounded-xl border border-line bg-surface shadow-card transition-shadow duration-150";
const INTERACTIVE_CLASSES =
  "text-left w-full hover:shadow-pop hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 cursor-pointer";

/** Surface card primitive. Interactive cards always render as native <button> or <a> elements. */
export function Card(props: CardProps) {
  if (props.interactive) {
    if ("href" in props && props.href) {
      const { interactive: _interactive, className, children, href, ...rest } = props;
      return (
        <a href={href} className={cn(BASE_CLASSES, INTERACTIVE_CLASSES, "block", className)} {...rest}>
          {children}
        </a>
      );
    }
    const { interactive: _interactive, className, children, type = "button", ...rest } =
      props as BaseCardProps & { interactive: true } & ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button type={type} className={cn(BASE_CLASSES, INTERACTIVE_CLASSES, className)} {...rest}>
        {children}
      </button>
    );
  }

  const { interactive: _interactive, className, children, ...rest } = props as BaseCardProps &
    HTMLAttributes<HTMLDivElement>;
  return (
    <div className={cn(BASE_CLASSES, className)} {...rest}>
      {children}
    </div>
  );
}

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...rest }, ref) {
    return <div ref={ref} className={cn("px-5 py-4 border-b border-line", className)} {...rest} />;
  },
);

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...rest }, ref) {
    return <div ref={ref} className={cn("p-5", className)} {...rest} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn("px-5 py-3.5 border-t border-line bg-surface-muted/60 rounded-b-xl", className)}
        {...rest}
      />
    );
  },
);
