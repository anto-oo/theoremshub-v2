import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  "aria-label"?: string
  disabled?: boolean
  className?: string
}

function Checkbox({ checked, onChange, disabled, className, ...rest }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      disabled={disabled}
      className={cn(
        "flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-[6px] border border-input bg-transparent transition-colors",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center data-unchecked:hidden">
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )
}

export { Checkbox }
