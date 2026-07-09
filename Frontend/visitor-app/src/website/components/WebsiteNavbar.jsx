import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'

import brandMark from '../../assets/images/Vmlogo.png'

function WebsiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="website-navbar">
      <div className={`website-shell website-navbar-inner ${menuOpen ? 'menu-open' : ''}`}>
        <Link to="/" className="website-brand" aria-label="Visitor Management System home">
          <img src={brandMark} alt="" className="website-brand-mark" />
         
        </Link>

        <nav className="website-nav">
          <a href="#home">Home</a>
          <a href="#privacy">Privacy &amp; Policy</a>
          <a href="#terms">Terms &amp; Conditions</a>
        </nav>

        <div className="website-navbar-actions">
          
          <NavLink to="/signup" className="website-btn website-btn-primary website-navbar-getstarted website-navbar-mobile-btn">
            Get Started
          </NavLink>
          <NavLink to="/login" className="website-btn website-btn-ghost website-navbar-login website-navbar-mobile-btn">
            Login
          </NavLink>

          <button
            type="button"
            className={`website-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <nav className="website-nav-mobile">
            <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#privacy" onClick={() => setMenuOpen(false)}>Privacy &amp; Policy</a>
            <a href="#terms" onClick={() => setMenuOpen(false)}>Terms &amp; Conditions</a>
          </nav>
        )}
      </div>
    </header>
  )
}

export default WebsiteNavbar
