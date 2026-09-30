import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { strings as t } from '@/i18n'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [classe, setClasse] = useState('')
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await signUp(username, password, {
        firstName,
        lastName,
        classe,
      })
      navigate('/dashboard')
    } catch (err: any) {
      const raw = err.message || t.auth.signup.failed
      // Supabase returns `Email address "..." is invalid` when it tries to
      // send a confirmation email to the synthetic address (DNS check on a
      // non-existent domain). That means "Confirm email" is ON in the
      // Supabase dashboard — it must be OFF for username-based auth.
      setError(
        raw.includes('is invalid') && raw.includes('@')
          ? `${raw}. ${t.auth.signup.supabaseHint}`
          : raw,
      )
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.signup.title}</CardTitle>
          <CardDescription>{t.auth.signup.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-username">{t.auth.signup.username}</Label>
              <Input
                id="signup-username"
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
              <Label htmlFor="signup-firstname">{t.auth.signup.name}</Label>
              <Input
                id="signup-firstname"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-lastname">{t.auth.signup.surname}</Label>
              <Input
                id="signup-lastname"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-classe">{t.auth.signup.className}</Label>
              <Input
                id="signup-classe"
                name="classe"
                type="text"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">{t.auth.signup.password}</Label>
              <Input
                id="signup-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full">{t.auth.signup.submit}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
