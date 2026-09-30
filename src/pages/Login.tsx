import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Info, TriangleAlert, OctagonAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useAppSettings } from '@/features/admin/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { strings as t } from '@/i18n'

function bannerActive(
  settings: { login_banner_enabled: boolean; login_banner_expires_at: string | null } | undefined,
): boolean {
  if (!settings || !settings.login_banner_enabled) return false
  if (settings.login_banner_expires_at === null) return true
  return new Date(settings.login_banner_expires_at).getTime() > Date.now()
}

const BANNER_STYLES: Record<string, { classes: string; Icon: typeof Info; label: string }> = {
  info: { classes: 'border-blue-300 bg-blue-50 text-blue-900', Icon: Info, label: t.auth.login.bannerKinds.info },
  warning: { classes: 'border-amber-300 bg-amber-50 text-amber-900', Icon: TriangleAlert, label: t.auth.login.bannerKinds.warning },
  destructive: { classes: 'border-red-300 bg-red-50 text-red-900', Icon: OctagonAlert, label: t.auth.login.bannerKinds.alert },
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { data: settings } = useAppSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      await signIn(username.trim(), password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.login.invalidCredentials)
    } finally {
      setPending(false)
    }
  }

  const banner = bannerActive(settings) && settings ? BANNER_STYLES[settings.login_banner_type] ?? BANNER_STYLES.info : null

  return (
    <div className="mx-auto w-full max-w-md py-4">
      {banner && settings && (
        <div role="status" className={cn('mb-4 flex gap-3 rounded-xl border p-4 text-sm', banner.classes)}>
          <banner.Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{banner.label}</p>
            <p className="mt-0.5">{settings.login_banner_message}</p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.login.title}</CardTitle>
          <CardDescription>{t.auth.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {error !== '' && (
            <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-username">{t.auth.login.username}</Label>
              <Input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">{t.auth.login.password}</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pending || username.trim() === '' || password === ''}>
              {pending ? t.auth.login.submitting : t.auth.login.submit}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t.auth.login.noAccountPrefix}{' '}
            <Link className="font-medium text-primary underline underline-offset-4" to="/signup">
              {t.auth.login.noAccountLink}
            </Link>
          </p>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t.auth.login.badgePrefix} <Link className="font-medium text-primary underline underline-offset-4" to="/badge">{t.auth.login.badgeLink}</Link> {t.auth.login.badgeSuffix}
      </p>
    </div>
  )
}
