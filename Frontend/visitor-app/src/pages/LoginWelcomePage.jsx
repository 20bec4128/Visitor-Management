import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import welcomeImage from '../website/images/welcomeImage.png'
import './LoginWelcomePage.css'

const DISPLAY_MS = 2000
const EXIT_MS = 650

function LoginWelcomePage() {
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), DISPLAY_MS)
    const navigateTimer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, DISPLAY_MS + EXIT_MS)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(navigateTimer)
    }
  }, [navigate])

  return (
    <main className={`login-welcome ${isExiting ? 'is-exiting' : ''}`} aria-label="Welcome">
      <div className="login-welcome-glow login-welcome-glow-left" aria-hidden="true" />
      <div className="login-welcome-glow login-welcome-glow-right" aria-hidden="true" />
      <section className="login-welcome-card">
        <img className="login-welcome-image" src={welcomeImage} alt="Welcome" />
      </section>
    </main>
  )
}

export default LoginWelcomePage
