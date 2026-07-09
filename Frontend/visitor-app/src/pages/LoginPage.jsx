import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login } from '../api/auth.js'
import { setAuthSession } from '../auth/authStorage.js'
import logo from '../assets/images/Vmlogo.png'
import signuplogo from '../assets/images/signuplogo.png'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorText('')
    setLoading(true)

    try {
      const normalizedUsername = username.trim()
      const normalizedPassword = password.trim()
      const result = await login(normalizedUsername, normalizedPassword)
      setAuthSession({
        username: result.username,
        role: result.role,
        permissions: result.permissions ?? {},
        token: result.token ?? '',
        remember,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorText(
        error instanceof Error && error.message
          ? error.message
          : 'Invalid username or password.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-grid">
        <aside className="auth-hero" aria-hidden="true">
          <img className="auth-hero-image" src={signuplogo} alt="" />
        </aside>

        <section className="auth-form-wrap">
          <div className="auth-card">
            <div className="auth-logo-row">
              <img src={logo} alt="SVL" className="auth-logo" />
            </div>

            <div className="auth-heading">
              <h2>Sign In</h2>
              <p>Please enter your details to sign in</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>Username</label>
                <div className="auth-input-group">
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <span className="auth-addon" aria-hidden="true">
                    @
                  </span>
                </div>
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    className="auth-addon auth-addon-btn"
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 12s3.636-7 10-7 10 7 10 7-3.636 7-10 7S2 12 2 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 12s3.636-7 10-7c2.188 0 4.06.692 5.59 1.66"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M22 12s-3.636 7-10 7c-2.188 0-4.06-.692-5.59-1.66"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.88 9.88A3 3 0 0 0 12 15c.35 0 .686-.06 1-.17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-meta-row">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember Me
                </label>
                <a className="auth-link" href="#" onClick={(e) => e.preventDefault()}>
                  Forgot Password?
                </a>
              </div>

              {errorText ? (
                <div className="auth-alert auth-alert-error">{errorText}</div>
              ) : null}

              <button className="auth-primary-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <p className="auth-footer-text">
                Don&apos;t have an account? <Link to="/signup">Create Account</Link>
              </p>
            </form>
          </div>

          <p className="auth-copyright">
            Copyright © 2026 - SVL
          </p>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
