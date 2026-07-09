import { useState } from 'react'
import { Link } from 'react-router-dom'

import { bootstrapAdmin } from '../api/auth.js'
import logo from '../assets/images/Vmlogo.png'
import authBg from '../assets/images/authentication-bg-03.svg'
import './SignupPage.css'

function SignupPage() {
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [loading, setLoading] = useState(false)
  const [bootstrapDetails, setBootstrapDetails] = useState({
    username: 'admin',
    password: 'Admin@123',
  })

  const handleBootstrap = async () => {
    setLoading(true)
    setStatus({ type: 'idle', message: '' })

    try {
      const result = await bootstrapAdmin()
      if (result?.username || result?.password) {
        setBootstrapDetails({
          username: result.username ?? 'admin',
          password: result.password ?? 'Admin@123',
        })
      }
      setStatus({
        type: 'success',
        message: result?.created
          ? 'Admin created successfully. Now login.'
          : 'Admin already exists. Now login.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to create admin.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-grid">
        <aside className="auth-hero" aria-hidden="true">
          <img className="auth-hero-image" src={authBg} alt="" />
        </aside>

        <section className="auth-form-wrap">
          <div className="auth-card">
            <div className="auth-logo-row">
              <img src={logo} alt="SVL" className="auth-logo" />
            </div>

            <div className="auth-heading">
              <h2>Create Admin Account</h2>
              <p>Bootstrap the default admin credentials.</p>
            </div>

            <div className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <input value={bootstrapDetails.username} disabled className="auth-input" />
              </div>

              <div className="auth-field">
                <label>Password</label>
                <input value={bootstrapDetails.password} disabled className="auth-input" />
              </div>

              {status.type !== 'idle' && (
                <div className={`auth-alert auth-alert-${status.type}`}>
                  {status.message}
                </div>
              )}

              <button
                type="button"
                className="auth-primary-btn bg-white-500"
                onClick={handleBootstrap}
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create Admin Account'}
              </button>

              <p className="auth-footer-text">
                Already created? <Link to="/login">Go to Login</Link>
              </p>
            </div>
          </div>
          <p className="auth-copyright">
            Copyright © 2026 - SVL
          </p>
        </section>
      </div>
    </div>
  )
}

export default SignupPage
