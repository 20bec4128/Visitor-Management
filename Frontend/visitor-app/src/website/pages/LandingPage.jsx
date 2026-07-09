import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

import heroDashboard from '../assets/VMDashboardView3D.png';
import AnalyticsMock from '../components/AnalyticsMock.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import Reveal from '../components/Reveal.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import Stack from '../components/Stack.jsx'
import WebsiteFooter from '../components/WebsiteFooter.jsx'
import WebsiteNavbar from '../components/WebsiteNavbar.jsx'
import '../styles/website.css'

const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

function filenameOrder(path) {
  const name = path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase()
  return wordToNum[name] ?? (parseInt(name, 10) || 999)
}

const state1Raw = import.meta.glob('../images/state1/*.{png,jpg,jpeg,webp}', { eager: true })
const state2Raw = import.meta.glob('../images/state2/*.{png,jpg,jpeg,webp}', { eager: true })
const state3Raw = import.meta.glob('../images/state3/*.{png,jpg,jpeg,webp}', { eager: true })
const state4Raw = import.meta.glob('../images/state4/*.{png,jpg,jpeg,webp}', { eager: true })

function makeCards(raw) {
  return Object.entries(raw)
    .sort(([a], [b]) => filenameOrder(b) - filenameOrder(a))
    .map(([path, mod]) => (
      <div key={path} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img src={mod.default} alt={`Preview ${filenameOrder(path)}`} className="card-image" />
        <span className="website-step-card-num">{filenameOrder(path)}</span>
      </div>
    ))
}

const stepImages = {
  0: makeCards(state1Raw),
  1: makeCards(state2Raw),
  2: makeCards(state3Raw),
  3: makeCards(state4Raw),
}

const features = [
  {
    title: 'Face Recognition Entry',
    description: 'Authenticate returning visitors instantly with camera-assisted matching tied to stored visitor profiles.',
    accent: '#2563eb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 3H6a3 3 0 0 0-3 3v2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M3 16v2a3 3 0 0 0 3 3h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 18c1.3-2.1 2.9-3.2 4.5-3.2S15.2 15.9 16.5 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Pre-registration & Approval Flow',
    description: 'Let teams invite visitors in advance, capture intent, and secure host approval before they arrive at the gate.',
    accent: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 7h8M8 12h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: 'Real-time Visitor Tracking',
    description: 'Track who is onsite, where they entered, and which host or zone they are associated with right now.',
    accent: '#f97316',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 21s6-4.4 6-10a6 6 0 1 0-12 0c0 5.6 6 10 6 10Z" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: 'QR Code Access',
    description: 'Speed up gate handling with QR-based visitor validation for scheduled arrivals and tokenized check-in journeys.',
    accent: '#2563eb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 14h1v1h-1zM19 14h1v4h-1zM14 17h3v3h-3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Factory Safety Monitoring',
    description: 'Overlay operational safeguards like induction status, PPE confirmation and escort rules into every visit.',
    accent: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3 5 6v5c0 4.4 2.9 8.5 7 10 4.1-1.5 7-5.6 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9.5 12 1.7 1.7 3.3-3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const steps = [
  ['Step 1', 'Face Verification', 'Capture a visitor image and validate identity with AI-assisted recognition.'],
  ['Step 2', 'Visitor Creation', 'Match existing profiles or register a new visitor with structured metadata.'],
  ['Step 3', 'Host Approval', 'Escalate the visit to the right host for confirmation and compliance checks.'],
  ['Step 4', 'Check-In & Tracking', 'Record entry, monitor movement and maintain a traceable visitor timeline.'],
]

function LandingPage() {
  const [shownStep, setShownStep] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())
  const stepsSectionRef = useRef(null)

  useEffect(() => {
    const el = stepsSectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setShownStep(null)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleCardHover(index) {
    if (!stepImages[index]) return
    if (!dismissed.has(index)) setShownStep(index)
  }

  function handleEyeClick(e, index) {
    e.stopPropagation()
    if (shownStep === index) {
      // user is closing — mark dismissed so hover won't reopen
      setShownStep(null)
      setDismissed(prev => new Set([...prev, index]))
    } else {
      // user is reopening — clear dismissed
      setDismissed(prev => { const s = new Set(prev); s.delete(index); return s })
      setShownStep(index)
    }
  }

  return (
    <div className="website-page website-page-home">
      <WebsiteNavbar />

      <main>
        <section className="website-hero" id="home">
          <div className="website-hero-mobile-actions">
            <Link to="/signup" className="website-btn website-btn-primary website-btn-sm">Get Started</Link>
            <Link to="/login" className="website-btn website-btn-secondary website-btn-sm">Login</Link>
          </div>
          <div className="website-shell website-hero-grid">
            <Reveal className="website-hero-copy" delay={80}>
              <p></p>
              <h1>Visitor Management System</h1>
              <p className="website-hero-text">
                Smart &amp; Secure Visitor Tracking for Factories. Create a polished first impression while keeping every
                visitor movement secure, auditable and ready for safety-critical operations.
              </p>
              <div className="website-hero-actions">
                <Link to="/signup" className="website-btn website-btn-primary">Get Started</Link>
                <Link to="/login" className="website-btn website-btn-secondary">Login</Link>
              </div>
            </Reveal>

            <Reveal className="website-hero-visual" delay={180}>
              <div className="website-hero-mockup-wrap">
                <div className="website-hero-mockup-glow" />
                <img
                  src={heroDashboard}
                  alt="VMS Dashboard Preview"
                  className="website-hero-mockup-img "
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="website-section">
          <div className="website-shell">
            <Reveal delay={60}>
              <SectionTitle
                eyebrow="Platform capabilities"
                title="Built for fast-moving factory reception teams"
                description="Every section of the visitor journey is designed to reduce manual effort while making compliance and security more visible."
              />
            </Reveal>
            <div className="website-features-grid">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 90}>
                  <FeatureCard {...feature} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="website-section website-section-alt" ref={stepsSectionRef}>
          <div className="website-shell">
            <Reveal delay={60}>
              <SectionTitle
                eyebrow="How it works"
                title="A streamlined flow from gate capture to monitored visit"
                description="The system keeps reception, host approval and onsite tracking connected in one operational loop."
                align="center"
              />
            </Reveal>
            <div className="website-steps-grid">
              {steps.map(([eyebrow, title, description], index) => (
                <Reveal key={title} delay={index * 110}>
                  <article
                    className="website-step-card"
                    onMouseEnter={() => handleCardHover(index)}
                  >
                    <div className="website-step-card-head">
                      <span>{eyebrow}</span>
                      {stepImages[index] && (
                        <div className="website-step-eye-wrap" title="Click to view flow images">
                          <svg
                            className="website-step-eye-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            width="20"
                            height="20"
                            onClick={(e) => handleEyeClick(e, index)}
                          >
                            {dismissed.has(index) ? (
                              /* closed eye */
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </>
                            ) : (
                              /* open eye */
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                              </>
                            )}
                          </svg>
                          <span className="website-step-eye-tooltip">Click to view flow images</span>
                        </div>
                      )}
                    </div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                  {stepImages[index] && shownStep === index && (
                    <div className="website-step-stack-wrap">
                      <Stack
                        cards={stepImages[index]}
                        autoplay
                        autoplayDelay={2500}
                        sendToBackOnClick
                        pauseOnHover
                        randomRotation
                        mobileClickOnly
                      />
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="website-section">
          <div className="website-shell">
            <Reveal delay={60}>
              <SectionTitle
                eyebrow="Operations analytics"
                title="Turn visitor data into safety and throughput decisions"
                description="Mock dashboards show the kind of actionable insights teams can use for staffing, gate planning and compliance reviews."
              />
            </Reveal>
            <Reveal delay={160}>
              <AnalyticsMock />
            </Reveal>
          </div>
        </section>

        <section className="website-section website-section-cta">
          <div className="website-shell">
            <Reveal className="website-cta-card  py-5" delay={80}>
              <p className="website-eyebrow">Ready to modernize entry control?</p>
              <h2>Start Managing Visitors Smartly</h2>
              <p >
                Replace manual visitor registers with a secure, welcoming experience designed for factories and safety-led workplaces.
              </p>
              <Link to="/signin" state={{ fromLanding: true }} className="website-btn website-btn-primary">Get Started</Link>
            </Reveal>
          </div>
        </section>

        <section className="website-legal" id="privacy">
          <div className="website-shell website-legal-grid">
            <Reveal delay={70}>
              <article className="website-legal-card" style={{ '--legal-accent': '#2563eb' }}>
                <p className="website-eyebrow">Privacy &amp; Policy</p>
                <h3>Privacy-first visitor records</h3>
                <p>
                  Personal data, visit purpose, approvals and facial verification details should be processed with explicit consent,
                  secure retention rules and role-based visibility across reception and host teams.
                </p>
              </article>
            </Reveal>
            <Reveal delay={150}>
              <article className="website-legal-card" id="terms" style={{ '--legal-accent': '#f97316' }}>
                <p className="website-eyebrow">Terms &amp; Conditions</p>
                <h3>Responsible usage for controlled facilities</h3>
                <p>
                  Visitor access, safety checks and approvals should follow internal site rules, authorized host
                  workflows and local compliance obligations before entry is granted.
                </p>
              </article>
            </Reveal>
          </div>
        </section>
      </main>

      <WebsiteFooter />
    </div>
  )
}

export default LandingPage
