import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { AuthMode, LoginForm, RegisterForm } from '../types'

type AuthPageProps = {
  mode: AuthMode
  registerForm: RegisterForm
  loginForm: LoginForm
  errorMessage: string
  statusMessage: string
  isSubmitting: boolean
  onChangeMode: (mode: AuthMode) => void
  onChangeRegisterForm: Dispatch<SetStateAction<RegisterForm>>
  onChangeLoginForm: Dispatch<SetStateAction<LoginForm>>
  onRegister: (event: FormEvent<HTMLFormElement>) => void
  onLogin: (event: FormEvent<HTMLFormElement>) => void
}

function AuthPage({
  mode,
  registerForm,
  loginForm,
  errorMessage,
  statusMessage,
  isSubmitting,
  onChangeMode,
  onChangeRegisterForm,
  onChangeLoginForm,
  onRegister,
  onLogin,
}: AuthPageProps) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            FG
          </div>
          <span>FarmGuard AI</span>
        </div>
        <h1>Weather-risk intelligence for Kenyan farms</h1>
        <p>
          Create your account to monitor farms, fetch local forecasts, generate risk scores, and
          prepare farmer-ready advisories from one dashboard.
        </p>
        <div className="workflow-strip" aria-label="FarmGuard workflow">
          <span>Register</span>
          <span>Create farm</span>
          <span>Assess risk</span>
          <span>Preview alert</span>
        </div>
      </section>

      <section className="auth-panel" aria-label="Authentication form">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => onChangeMode('register')}
          >
            Register
          </button>
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => onChangeMode('login')}
          >
            Login
          </button>
        </div>

        {mode === 'register' ? (
          <form className="auth-form" onSubmit={onRegister}>
            <div className="form-grid two-column">
              <label>
                First name
                <input
                  value={registerForm.first_name}
                  onChange={(event) =>
                    onChangeRegisterForm((form) => ({ ...form, first_name: event.target.value }))
                  }
                  autoComplete="given-name"
                />
              </label>
              <label>
                Last name
                <input
                  value={registerForm.last_name}
                  onChange={(event) =>
                    onChangeRegisterForm((form) => ({ ...form, last_name: event.target.value }))
                  }
                  autoComplete="family-name"
                />
              </label>
            </div>
            <label>
              Username
              <input
                value={registerForm.username}
                onChange={(event) =>
                  onChangeRegisterForm((form) => ({ ...form, username: event.target.value }))
                }
                autoComplete="username"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  onChangeRegisterForm((form) => ({ ...form, email: event.target.value }))
                }
                autoComplete="email"
              />
            </label>
            <div className="form-grid two-column">
              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    onChangeRegisterForm((form) => ({ ...form, password: event.target.value }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={registerForm.password_confirm}
                  onChange={(event) =>
                    onChangeRegisterForm((form) => ({
                      ...form,
                      password_confirm: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
            {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onLogin}>
            <label>
              Username
              <input
                value={loginForm.username}
                onChange={(event) =>
                  onChangeLoginForm((form) => ({ ...form, username: event.target.value }))
                }
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  onChangeLoginForm((form) => ({ ...form, password: event.target.value }))
                }
                autoComplete="current-password"
                required
              />
            </label>
            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
            {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default AuthPage
