import { Link, useNavigate } from 'react-router-dom'

import Reveal from '../components/Reveal.jsx'
import WebsiteNavbar from '../components/WebsiteNavbar.jsx'
import '../styles/website.css'

function SignInPage() {
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/login')
  }

  return (
    <div className="website-page website-page-signin">
      <WebsiteNavbar />
      <main className="website-auth">
        <div className="website-shell website-auth-shell">
          <Reveal className="website-auth-copy" delay={80}>
            <p className="website-eyebrow">Secure sign in</p>
            <h1>Welcome back to your visitor operations hub</h1>
            <p>
              Review approvals, monitor live entries and coordinate safe visitor journeys across every factory checkpoint.
            </p>
            <div className="website-auth-benefits">
              <div><i /> Live reception control</div>
              <div><i /> Faster host approvals</div>
              <div><i /> Safer site visibility</div>
            </div>
          </Reveal>

          <Reveal className="website-auth-card" delay={180}>
            <form onSubmit={handleSubmit}>
              <Link to="/" className="website-auth-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </Link>
              <div className="website-auth-header">
                <p className="website-card-label">Sign in</p>
                <h2>Access your dashboard</h2>
              </div>

              <label className="website-field">
                <span>Email</span>
                <input type="email" placeholder="name@company.com" required />
              </label>

              <label className="website-field">
                <span>Password</span>
                <input type="password" placeholder="Enter your password" required />
              </label>

              <button type="submit" className="website-btn website-btn-primary website-btn-block">
                Login
              </button>

              <div className="website-auth-links">
                <a href="#forgot-password">Forgot Password</a>
                <Link to="/">Back to Home</Link>
              </div>
            </form>
          </Reveal>
        </div>
      </main>
    </div>
  )
}

export default SignInPage
