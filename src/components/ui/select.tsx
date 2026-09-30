import { Select as BaseSelect } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: React.ReactNode
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  "aria-label"?: string
  className?: string
  disabled?: boolean
}

function Select({ value, onValueChange, options, placeholder, className, disabled, ...rest }: SelectProps) {
  return (
    <BaseSelect.Root value={value} onValueChange={(v) => onValueChange((v ?? "") as string)} disabled={disabled}>
      <BaseSelect.Trigger
        className={cn(
          "flex h-9 min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
          className,
        )}
        {...rest}
      >
        <BaseSelect.Value placeholder={placeholder ?? "—"} className="truncate" />
        <BaseSelect.Icon>
          <ChevronDown size={16} aria-hidden="true" className="text-muted-foreground" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50" sideOffset={4}>
          <BaseSelect.Popup className="max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-input bg-card p-1 text-sm text-card-foreground shadow-lg">
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value === "" ? "__empty__" : o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 outline-none data-highlighted:bg-muted data-highlighted:text-foreground"
              >
                <BaseSelect.ItemText className="truncate">{o.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator>
                  <Check size={14} aria-hidden="true" />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

export { Select }
