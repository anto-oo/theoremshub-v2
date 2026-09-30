import { Radio as BaseRadio } from "@base-ui/react/radio"
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group"
import { cn } from "@/lib/utils"

interface RadioProps {
  checked: boolean
  onChange: () => void
  name?: string
  "aria-label"?: string
  disabled?: boolean
  className?: string
}

// Single boolean radio: plain button with role=radio (Base Radio.Root is
// group-bound by design, so a lightweight custom control is the smaller diff).
function Radio({ checked, onChange, disabled, className, ...rest }: RadioProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-full border border-input bg-transparent transition-colors",
        checked && "border-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <span className={cn("h-2 w-2 rounded-full bg-primary", !checked && "hidden")} aria-hidden="true" />
    </button>
  )
}

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}

function RadioGroup({ value, onValueChange, children, className, ...rest }: RadioGroupProps) {
  return (
    <BaseRadioGroup value={value} onValueChange={(v) => onValueChange(v as string)} className={cn("flex flex-col gap-1", className)} {...rest}>
      {children}
    </BaseRadioGroup>
  )
}

function RadioItem({
  value,
  label,
  disabled,
}: {
  value: string
  label: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <BaseRadio.Root
        value={value}
        disabled={disabled}
        className="flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-full border border-input bg-transparent transition-colors data-checked:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BaseRadio.Indicator className="h-2 w-2 rounded-full bg-primary data-unchecked:hidden" />
      </BaseRadio.Root>
      <span>{label}</span>
    </label>
  )
}

export { Radio, RadioGroup, RadioItem }
