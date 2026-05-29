import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SearchBar({
  id,
  label,
  value,
  placeholder = "Search...",
  onChange,
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className="h-11 rounded-xl pl-10"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
