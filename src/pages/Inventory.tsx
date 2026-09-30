import { useState } from 'react'
import CurrentInventoryTab from '@/features/inventory/components/CurrentInventoryTab'
import PastInventoryTab from '@/features/inventory/components/PastInventoryTab'
import { strings as t } from '@/i18n'
import { Button } from '@/components/ui/button'

export default function Inventory() {
  const [tab, setTab] = useState<'current' | 'past'>('current')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.inventory.title}</h1>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant={tab === 'current' ? 'default' : 'outline'} onClick={() => setTab('current')}>
          {t.inventory.tabs.current}
        </Button>
        <Button type="button" size="sm" variant={tab === 'past' ? 'default' : 'outline'} onClick={() => setTab('past')}>
          {t.inventory.tabs.past}
        </Button>
      </div>

      {tab === 'current' ? <CurrentInventoryTab /> : <PastInventoryTab />}
    </div>
  )
}
