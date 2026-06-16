import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[7px] border font-medium leading-none outline-none transition focus-visible:shadow-[var(--ds-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "secondary",
    },
    variants: {
      size: {
        md: "h-9 px-3 text-[13px]",
        sm: "h-8 px-2.5 text-[12px]",
      },
      variant: {
        ghost:
          "border-transparent bg-transparent text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
        primary:
          "border-[var(--ds-gray-1000)] bg-[var(--ds-gray-1000)] text-[var(--ds-background-100)] hover:border-black hover:bg-black",
        secondary:
          "border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-1000)] hover:border-[var(--ds-gray-alpha-500)] hover:bg-[var(--ds-gray-100)]",
      },
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function Button({
  asChild = false,
  children,
  className,
  icon: Icon,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    asChild?: boolean;
    children: ReactNode;
    icon?: LucideIcon;
  }) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ size, variant }), className)}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
      {children}
    </Component>
  );
}

export function ButtonLink({
  children,
  className,
  href = "#",
  icon: Icon,
  size = "md",
  variant = "secondary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  icon?: LucideIcon;
} & ButtonVariantProps) {
  return (
    <a
      className={cn(buttonVariants({ size, variant }), className)}
      href={href}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
      {children}
    </a>
  );
}
