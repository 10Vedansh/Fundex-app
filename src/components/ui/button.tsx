import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button system — black pill, white text, tracking-tight font.
 * Inspired by SynoDrive / luxury fintech CTAs.
 *
 * variants:
 *  - default     : pure black bg, white text (the new "house" CTA)
 *  - secondary   : white bg, black text (used as accent CTA, e.g. "Get Started")
 *  - outline     : transparent bg, white border, white text
 *  - ghost       : no chrome, white-on-hover
 *  - destructive : red, untouched semantics
 *  - link        : text-only
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-tight ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white border border-white/10 hover:bg-neutral-900 hover:border-white/20 active:scale-[0.98] shadow-[0_1px_0_0_hsl(0_0%_100%/0.05)_inset]",
        secondary:
          "bg-white text-black hover:bg-neutral-200 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-white/15 bg-transparent text-foreground hover:bg-white/5 hover:border-white/25",
        ghost: "hover:bg-white/5 hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline rounded-md",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
