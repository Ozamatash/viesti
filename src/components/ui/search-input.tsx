"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "./input";
import { cn } from "~/lib/utils";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export function SearchInput({
  className,
  onSearch,
  ...props
}: SearchInputProps) {
  // Debounce search
  const [value, setValue] = React.useState("");
  const debouncedSearch = React.useCallback(
    React.useMemo(
      () =>
        (fn: (value: string) => void) => {
          let timeoutId: NodeJS.Timeout;
          return (value: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(value), 300);
          };
        },
      []
    ),
    []
  );

  const handleSearch = React.useCallback(
    (value: string) => {
      onSearch?.(value);
    },
    [onSearch]
  );

  const debouncedHandleSearch = React.useMemo(
    () => debouncedSearch(handleSearch),
    [debouncedSearch, handleSearch]
  );

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedHandleSearch(e.target.value);
        }}
        className="pl-9"
        {...props}
      />
    </div>
  );
} 