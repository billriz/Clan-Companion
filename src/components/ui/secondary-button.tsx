import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return <Button className={cn("h-11 rounded-xl", className)} variant="secondary" {...props} />;
}
