import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddDialog } from '@/shared/components/AddDialog'
import { strings as t } from '@/i18n'
import type { InventoryPdfData } from '@/features/inventory/lib/generateInventoryPdf'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (data: InventoryPdfData) => void
  isPending: boolean
}

export default function GenerateInventoryPdfDialog({ open, onOpenChange, onGenerate, isPending }: Props) {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [event, setEvent] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [referentName, setReferentName] = useState('')

  const handleOpenChange = (isOpen: boolean): void => {
    if (isOpen) {
      setName('')
      setClassName('')
      setEvent('')
      setDate(new Date().toISOString().split('T')[0])
      setTime(new Date().toTimeString().slice(0, 5))
      setReferentName('')
    }
    onOpenChange(isOpen)
  }

  const isValid =
    name.trim() !== '' && className.trim() !== '' && event.trim() !== '' && date !== '' && time !== '' && referentName.trim() !== ''

  return (
    <AddDialog open={open} onOpenChange={handleOpenChange} title={t.inventory.pdfDialogTitle}>
      <p className="text-sm text-muted-foreground">{t.inventory.pdfDialogDescription}</p>
      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pdf-name">{t.inventory.fieldName}</Label>
          <Input id="pdf-name" placeholder={t.inventory.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf-class">{t.inventory.fieldClass}</Label>
          <Input id="pdf-class" placeholder={t.inventory.classPlaceholder} value={className} onChange={(e) => setClassName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf-event">{t.inventory.fieldEvent}</Label>
          <Input id="pdf-event" placeholder={t.inventory.eventPlaceholder} value={event} onChange={(e) => setEvent(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-date">{t.inventory.fieldDate}</Label>
            <Input id="pdf-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-time">{t.inventory.fieldTime}</Label>
            <Input id="pdf-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdf-referent">{t.inventory.fieldReferent}</Label>
          <Input
            id="pdf-referent"
            placeholder={t.inventory.referentPlaceholder}
            value={referentName}
            onChange={(e) => setReferentName(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
        <Button
          type="button"
          disabled={!isValid || isPending}
          onClick={() => onGenerate({ name: name.trim(), className: className.trim(), event: event.trim(), date, time, referentName: referentName.trim() })}
        >
          {isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
          {t.inventory.downloadPdf}
        </Button>
      </div>
    </AddDialog>
  )
}
