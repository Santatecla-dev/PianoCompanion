import { useState } from 'react'
import type { FormEvent } from 'react'
import { loginUser, registerUser } from './api'
import type { ApiUser } from './api'

type Props = { onAuthenticated: (token: string, user: ApiUser) => void }

export function AuthScreen({ onAuthenticated }: Props) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [level, setLevel] = useState('Intermediate')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setIsLoading(true)
    try {
      const response = isRegistering ? await registerUser({ name, email, password, level }) : await loginUser({ email, password })
      onAuthenticated(response.accessToken, response.user)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to connect to Piano Companion') }
    finally { setIsLoading(false) }
  }

  return <main className="auth-screen"><section className="auth-art"><div className="auth-brand"><span className="brand-mark" aria-hidden="true">◒</span> Piano<span>Companion</span></div><div className="auth-quote"><span className="quote-mark">“</span><h1>Make room for<br /><em>beautiful</em> progress.</h1><p>A calmer way to practice the music you love.</p></div><div className="auth-art-note" aria-hidden="true">♪</div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><p className="eyebrow">WELCOME TO YOUR PRACTICE SPACE</p><h2>{isRegistering ? 'Create your account' : 'Welcome back'}</h2><p className="auth-subtitle">{isRegistering ? 'Start building a practice habit that lasts.' : 'Pick up where your music left off.'}</p>{isRegistering && <label>Your name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Elena Carter" /></label>}<label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{isRegistering && <label>Your level<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Beginner</option><option>Early intermediate</option><option>Intermediate</option><option>Advanced</option></select></label>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={isLoading}>{isLoading ? 'Opening your space…' : isRegistering ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span></button><p className="auth-switch">{isRegistering ? 'Already have an account?' : 'New to Piano Companion?'} <button type="button" onClick={() => { setIsRegistering((current) => !current); setError('') }}>{isRegistering ? 'Sign in' : 'Create an account'}</button></p></form></section></main>
}
