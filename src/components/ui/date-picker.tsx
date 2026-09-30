import { useMemo, useState } from "react"
import { Popover as BasePopover } from "@base-ui/react/popover"
import { addMonths, format, isValid, parse, setHours, setMinutes, startOfMonth, startOfWeek, addDays } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Select } from "./select"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

function parseDate(value: string): Date | null {
  if (value === "") return null
  const d = parse(value, "yyyy-MM-dd", new Date())
  return isValid(d) ? d : null
}

function toKey(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function Calendar({ selected, onPick }: { selected: Date | null; onPick: (d: Date) => void }) {
  const [cursor, setCursor] = useState<Date>(() => selected ?? new Date())
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  }, [cursor])

  return (
    <div className="w-64 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mese precedente"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded p-1 hover:bg-muted"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="text-sm font-medium capitalize">{format(cursor, "MMMM yyyy")}</span>
        <button
          type="button"
          aria-label="Mese successivo"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded p-1 hover:bg-muted"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {weeks.flat().map((d) => {
          const isCurrentMonth = d.getMonth() === cursor.getMonth()
          const isSelected = selected !== null && toKey(d) === toKey(selected)
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "rounded-md p-1.5 text-sm transition-colors hover:bg-muted",
                !isCurrentMonth && "opacity-40",
                isSelected && "bg-primary font-medium text-primary-foreground hover:bg-primary/80",
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  "aria-label"?: string
  className?: string
}

function DatePicker({ value, onChange, required, className, ...rest }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseDate(value)
  const display = parsed ? format(parsed, "dd/MM/yyyy") : ""

  return (
    <BasePopover.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <Input
          value={display}
          placeholder="gg/mm/aaaa"
          readOnly
          required={required}
          onClick={() => setOpen(true)}
          className="cursor-pointer pr-9"
          {...rest}
        />
        <BasePopover.Trigger
          aria-label="Apri calendario"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CalendarDays size={16} aria-hidden="true" />
        </BasePopover.Trigger>
      </div>
      <BasePopover.Portal>
        <BasePopover.Positioner className="z-50" sideOffset={4}>
          <BasePopover.Popup className="rounded-md border border-input bg-card text-card-foreground shadow-lg">
            <Calendar
              selected={parsed}
              onPick={(d) => {
                onChange(toKey(d))
                setOpen(false)
              }}
            />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}

function parseDateTime(value: string): Date | null {
  if (value === "") return null
  const d = parse(value, "yyyy-MM-dd'T'HH:mm", new Date())
  return isValid(d) ? d : null
}

function toDateTimeKey(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

const pad2 = (n: number): string => String(n).padStart(2, "0")
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: pad2(h), label: pad2(h) }))
const MINUTES = Array.from({ length: 12 }, (_, i) => ({ value: pad2(i * 5), label: pad2(i * 5) }))

function DateTimePicker({ value, onChange, required, className, ...rest }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseDateTime(value)
  const display = parsed ? format(parsed, "dd/MM/yyyy HH:mm") : ""

  const setTime = (hh: string | null, mm: string | null): void => {
    const base = parsed ?? new Date()
    const h = hh !== null ? Number(hh) : base.getHours()
    const m = mm !== null ? Number(mm) : base.getMinutes()
    onChange(toDateTimeKey(setMinutes(setHours(base, h), m)))
  }

  return (
    <BasePopover.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <Input
          value={display}
          placeholder="gg/mm/aaaa hh:mm"
          readOnly
          required={required}
          onClick={() => setOpen(true)}
          className="cursor-pointer pr-9"
          {...rest}
        />
        <BasePopover.Trigger
          aria-label="Apri calendario"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CalendarDays size={16} aria-hidden="true" />
        </BasePopover.Trigger>
      </div>
      <BasePopover.Portal>
        <BasePopover.Positioner className="z-50" sideOffset={4}>
          <BasePopover.Popup className="rounded-md border border-input bg-card text-card-foreground shadow-lg">
            <Calendar
              selected={parsed}
              onPick={(d) => {
                const base = parsed ?? new Date()
                onChange(toDateTimeKey(setMinutes(setHours(d, base.getHours()), base.getMinutes())))
              }}
            />
            <div className="flex items-center gap-2 border-t p-3">
              <Select
                aria-label="Ora"
                value={parsed ? pad2(parsed.getHours()) : ""}
                onValueChange={(v) => setTime(v, null)}
                options={HOURS}
                placeholder="HH"
                className="h-8"
              />
              <span aria-hidden="true">:</span>
              <Select
                aria-label="Minuti"
                value={parsed ? pad2(parsed.getMinutes() - (parsed.getMinutes() % 5)) : ""}
                onValueChange={(v) => setTime(null, v)}
                options={MINUTES}
                placeholder="MM"
                className="h-8"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                OK
              </button>
            </div>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}

export { DatePicker, DateTimePicker }
