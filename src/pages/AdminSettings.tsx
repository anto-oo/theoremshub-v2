import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBulkAssignRoles, useCreateInstrument, useDeleteInstrument, useInstruments, useMembersAdmin, useUpdateAppSettings, useAppSettings } from '@/features/admin/hooks'
import { useCreateInventoryCategory, useDeleteInventoryCategory, useInventoryCategories } from '@/features/inventory/hooks'
import { loadPdfSettings, savePdfSettings } from '@/features/inventory/lib/generateInventoryPdf'
import type { AppRole } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { strings as t } from '@/i18n'

const ROLES: AppRole[] = ['admin', 'manager', 'user', 'candidate']

export default function AdminSettings() {
  const [tab, setTab] = useState<'roles' | 'banner' | 'maintenance' | 'surveys' | 'instruments' | 'inventory'>('roles')
  const { data: members } = useMembersAdmin()
  const { data: settings } = useAppSettings()
  const { data: instruments } = useInstruments()
  const [instrumentError, setInstrumentError] = useState('')
  const bulkAssign = useBulkAssignRoles()
  const updateSettings = useUpdateAppSettings()
  const createInstrument = useCreateInstrument()
  const deleteInstrument = useDeleteInstrument()
  const [instrumentName, setInstrumentName] = useState('')

  const [selected, setSelected] = useState<string[]>([])
  const [newRole, setNewRole] = useState<AppRole>('user')
  const [bannerEnabled, setBannerEnabled] = useState(false)
  const [bannerMessage, setBannerMessage] = useState('')
  const [bannerType, setBannerType] = useState('info')
  const [bannerExpiry, setBannerExpiry] = useState('')
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [saved, setSaved] = useState('')

  const toggle = (id: string): void => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const handleAddInstrument = async (): Promise<void> => {
    if (instrumentName.trim() === '') return
    setInstrumentError('')
    try {
      await createInstrument.mutateAsync(instrumentName.trim())
      setInstrumentName('')
    } catch (err) {
      setInstrumentError(err instanceof Error ? err.message : t.common.errorGeneric)
    }
  }

  const handleDeleteInstrument = async (id: number): Promise<void> => {
    if (!window.confirm(t.adminSettings.instrumentDeleteConfirm)) return
    setInstrumentError('')
    try {
      await deleteInstrument.mutateAsync(id)
    } catch (err) {
      setInstrumentError(err instanceof Error ? err.message : t.common.errorGeneric)
    }
  }

  const handleBulk = async (): Promise<void> => {
    await bulkAssign.mutateAsync({ userIds: selected, role: newRole })
    setSelected([])
  }

  const handleBannerSave = async (): Promise<void> => {
    await updateSettings.mutateAsync({
      login_banner_enabled: bannerEnabled,
      login_banner_message: bannerMessage,
      login_banner_type: bannerType,
      login_banner_expires_at: bannerExpiry === '' ? null : new Date(bannerExpiry).toISOString(),
    })
    setSaved(t.adminSettings.bannerSaved)
  }

  const handleMaintenanceSave = async (): Promise<void> => {
    await updateSettings.mutateAsync({ maintenance_mode: maintenance, maintenance_message: maintenanceMsg })
    setSaved(t.adminSettings.settingsSaved)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t.adminSettings.title}</h1>
      {saved !== '' && <p className="mt-2 text-sm text-slate-600">{saved}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(['roles', 'instruments', 'inventory', 'banner', 'maintenance', 'surveys'] as const).map((tb) => (
          <Button key={tb} type="button" size="sm" variant={tab === tb ? 'default' : 'outline'} onClick={() => setTab(tb)}>
            {tb === 'roles' ? t.adminSettings.tabs.roles : tb === 'instruments' ? t.adminSettings.tabs.instruments : tb === 'inventory' ? t.adminSettings.tabs.inventory : tb === 'banner' ? t.adminSettings.tabs.loginBanner : tb === 'maintenance' ? t.adminSettings.tabs.maintenance : t.adminSettings.tabs.surveys}
          </Button>
        ))}
      </div>

      {tab === 'roles' && (
        <Card className="mt-4">
          <CardHeader><CardTitle>{t.adminSettings.massAssign}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {(members ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selected.includes(m.id)} onChange={() => toggle(m.id)} aria-label={m.username ?? m.id} />
                  <span className="font-medium">{m.username}</span>
                  <Badge variant="secondary">{m.role}</Badge>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as AppRole)}
                options={ROLES.map((r) => ({ value: r, label: r }))}
                aria-label={t.adminSettings.newRoleLabel}
              />
              <Button type="button" disabled={selected.length === 0 || bulkAssign.isPending} onClick={handleBulk}>
                {t.adminSettings.assignTo(selected.length)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'banner' && (
        <Card className="mt-4">
          <CardHeader><CardTitle>{t.adminSettings.tabs.loginBanner}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settings && (
                <p className="text-sm text-slate-600">
                  {t.adminSettings.currentStatus(settings.login_banner_enabled)} — {settings.login_banner_type} — {settings.login_banner_message}
                </p>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={bannerEnabled} onChange={setBannerEnabled} />
                {t.adminSettings.bannerActive}
              </label>
              <div><Label>{t.adminSettings.bannerMessage}</Label><Input value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} /></div>
              <div>
                <Label>{t.adminSettings.bannerType}</Label>
                <Select
                  value={bannerType}
                  onValueChange={setBannerType}
                  options={['info', 'warning', 'success', 'destructive'].map((tb) => ({ value: tb, label: tb }))}
                />
              </div>
              <div><Label>{t.adminSettings.bannerExpiry}</Label><DateTimePicker value={bannerExpiry} onChange={setBannerExpiry} /></div>
              <Button type="button" onClick={handleBannerSave}>{t.adminSettings.saveBanner}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'maintenance' && (
        <Card className="mt-4">
          <CardHeader><CardTitle>{t.adminSettings.tabs.maintenance}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {t.adminSettings.maintenancePollHint}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={maintenance} onChange={setMaintenance} />
                {t.adminSettings.maintenanceModeLabel}
              </label>
              <div><Label>{t.adminSettings.maintenanceMessageLabel}</Label><Input value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} /></div>
              <Button type="button" onClick={handleMaintenanceSave}>{t.adminSettings.save}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'instruments' && (
        <Card className="mt-4">
          <CardHeader><CardTitle>{t.adminSettings.tabs.instruments}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{t.adminSettings.instrumentsHint}</p>
            {instrumentError !== '' && <p role="alert" className="mt-2 text-sm text-red-600">{instrumentError}</p>}
            <ul className="mt-2 space-y-1">
              {(instruments ?? []).map((ins) => (
                <li key={ins.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{ins.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteInstrument.isPending}
                    onClick={() => handleDeleteInstrument(ins.id)}
                  >
                    {t.common.remove}
                  </Button>
                </li>
              ))}
            </ul>
            {(instruments ?? []).length === 0 && (
              <p className="mt-2 text-sm text-slate-500">{t.adminSettings.instrumentsEmpty}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Input
                placeholder={t.adminSettings.instrumentNamePlaceholder}
                value={instrumentName}
                onChange={(e) => setInstrumentName(e.target.value)}
                aria-label={t.adminSettings.tabs.instruments}
              />
              <Button type="button" disabled={instrumentName.trim() === '' || createInstrument.isPending} onClick={handleAddInstrument}>
                {t.common.add}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'inventory' && <InventorySettings />}

      {tab === 'surveys' && (
        <Card className="mt-4">
          <CardHeader><CardTitle>{t.adminSettings.tabs.surveys}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{t.adminSettings.surveysHint}</p>
            <Link to="/surveys" className="mt-2 inline-block text-blue-600 underline">{t.adminSettings.goToSurveys}</Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InventorySettings() {
  const { data: categories } = useInventoryCategories()
  const createCategory = useCreateInventoryCategory()
  const deleteCategory = useDeleteInventoryCategory()
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [pdf, setPdf] = useState(loadPdfSettings)
  const [pdfSaved, setPdfSaved] = useState('')

  const handleAddCategory = async (): Promise<void> => {
    if (categoryName.trim() === '') return
    setCategoryError('')
    try {
      await createCategory.mutateAsync(categoryName.trim())
      setCategoryName('')
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : t.common.errorGeneric)
    }
  }

  const handlePdfSave = (): void => {
    savePdfSettings(pdf)
    setPdfSaved(t.adminSettings.inventoryPdfSaved)
  }

  return (
    <div className="space-y-4">
      <Card className="mt-4">
        <CardHeader><CardTitle>{t.adminSettings.inventoryCategoriesTitle}</CardTitle></CardHeader>
        <CardContent>
          {categoryError !== '' && <p role="alert" className="mb-2 text-sm text-red-600">{categoryError}</p>}
          <ul className="space-y-1">
            {(categories ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={deleteCategory.isPending}
                  onClick={() => deleteCategory.mutate(c.id)}
                >
                  {t.common.remove}
                </Button>
              </li>
            ))}
          </ul>
          {(categories ?? []).length === 0 && (
            <p className="mt-2 text-sm text-slate-500">{t.adminSettings.inventoryCategoriesEmpty}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Input
              placeholder={t.adminSettings.inventoryCategoryPlaceholder}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              aria-label={t.adminSettings.inventoryCategoriesTitle}
            />
            <Button type="button" disabled={categoryName.trim() === '' || createCategory.isPending} onClick={handleAddCategory}>
              {t.common.add}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.adminSettings.inventoryPdfTitle}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label>{t.adminSettings.inventoryLogoLeft}</Label>
              <Input
                placeholder={t.adminSettings.inventoryLogoPlaceholder}
                value={pdf.logoLeftUrl}
                onChange={(e) => setPdf((p) => ({ ...p, logoLeftUrl: e.target.value }))}
              />
              {pdf.logoLeftUrl !== '' && <img src={pdf.logoLeftUrl} alt="" className="mt-1 h-12 w-auto rounded border object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
            <div>
              <Label>{t.adminSettings.inventoryLogoRight}</Label>
              <Input
                placeholder={t.adminSettings.inventoryLogoPlaceholder}
                value={pdf.logoRightUrl}
                onChange={(e) => setPdf((p) => ({ ...p, logoRightUrl: e.target.value }))}
              />
              {pdf.logoRightUrl !== '' && <img src={pdf.logoRightUrl} alt="" className="mt-1 h-12 w-auto rounded border object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
            <div>
              <Label>{t.adminSettings.inventoryFooterLabel}</Label>
              <Input
                placeholder={t.adminSettings.inventoryFooterPlaceholder}
                value={pdf.footerLabel}
                onChange={(e) => setPdf((p) => ({ ...p, footerLabel: e.target.value }))}
              />
            </div>
            {pdfSaved !== '' && <p className="text-sm text-slate-600">{pdfSaved}</p>}
            <Button type="button" onClick={handlePdfSave}>{t.adminSettings.save}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
