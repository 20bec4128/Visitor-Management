import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import {
  getAccount,
  updateAccountProfile,
  changeAccountPassword,
  getSettingsSection,
  saveSettingsSection,
  sendTestEmail,
  uploadAccountPhoto,
  uploadCompanyLogo,
  mediaUrl,
} from '../api/config.js'
import { hasPermission } from '../auth/authStorage.js'
import { PERMISSIONS } from '../rbac/access.js'
import './SettingsPage.css'

// Profile + Password are personal account settings every signed-in user gets.
// The remaining sections are system-wide and require the settings.manage permission.
const PERSONAL_TABS = [
  { key: 'profile', title: 'User Profile', subtitle: 'User account profile settings' },
  { key: 'password', title: 'Password', subtitle: 'Password settings' },
]

const SYSTEM_TABS = [
  { key: 'general', title: 'General', subtitle: 'General settings' },
  { key: 'email', title: 'Email', subtitle: 'Email SMTP settings' },
  { key: 'payment', title: 'Payment', subtitle: 'Payment settings' },
]

// Server-persisted app-setting sections (saved via /api/settings/{section}).
const SECTION_PANELS = {
  general: {
    section: 'general',
    heading: 'General',
    description: 'Configure general application preferences.',
    icon: '🛠️',
    fields: [
      { name: 'company_name', label: 'Company Name', type: 'text', placeholder: 'Acme Corp' },
      { name: 'company_logo', label: 'Company Logo', type: 'file' },
      { name: 'contact_number', label: 'Contact Number', type: 'tel', placeholder: 'Enter contact number' },
      { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter company address' },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'select',
        options: ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai'],
      },
      { name: 'date_format', label: 'Date Format', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
      { name: 'language', label: 'Language', type: 'select', options: ['English', 'Hindi', 'Spanish', 'Arabic'] },
    ],
  },
  email: {
    section: 'email',
    heading: 'Email (SMTP)',
    description: 'Configure the outgoing mail server.',
    icon: '✉️',
    fields: [
      { name: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { name: 'smtpPort', label: 'SMTP Port', type: 'number', placeholder: '587' },
      { name: 'smtpUser', label: 'SMTP Username', type: 'text', placeholder: 'username' },
      { name: 'smtpPassword', label: 'SMTP Password', type: 'password', placeholder: '••••••••' },
      { name: 'encryption', label: 'Encryption', type: 'select', options: ['None', 'TLS', 'SSL'] },
      { name: 'fromName', label: 'From Name', type: 'text', placeholder: 'Visitor Management' },
      { name: 'fromEmail', label: 'From Email', type: 'email', placeholder: 'no-reply@example.com' },
    ],
  },
  payment: {
    section: 'payment',
    heading: 'Payment',
    description: 'Configure your payment gateway.',
    icon: '💳',
    fields: [
      { name: 'gateway', label: 'Gateway', type: 'select', options: ['Razorpay', 'Stripe', 'PayPal'] },
      { name: 'keyId', label: 'Key ID / Publishable Key', type: 'text', placeholder: 'rzp_live_xxxxxxxx' },
      { name: 'keySecret', label: 'Key Secret', type: 'password', placeholder: '••••••••' },
      { name: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBP', 'AED'] },
      { name: 'enabled', label: 'Enable online payments', type: 'toggle' },
    ],
  },
}

function defaultsFor(fields) {
  const out = {}
  fields.forEach((f) => {
    if (f.type === 'file') return
    out[f.name] = f.type === 'toggle' ? false : ''
  })
  return out
}

function FieldControl({ field, value, onChange }) {
  if (field.type === 'file') {
    return <input id={field.name} type="file" onChange={onChange} />
  }
  if (field.type === 'select') {
    return (
      <select id={field.name} value={value} onChange={onChange}>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return <textarea id={field.name} rows={4} placeholder={field.placeholder} value={value} onChange={onChange} />
  }
  if (field.type === 'toggle') {
    return (
      <label className="settings-toggle">
        <input type="checkbox" checked={Boolean(value)} onChange={onChange} />
        <span className="settings-toggle-track" aria-hidden="true" />
        <span className="settings-toggle-text">{value ? 'Enabled' : 'Disabled'}</span>
      </label>
    )
  }
  return <input id={field.name} type={field.type} placeholder={field.placeholder} value={value} onChange={onChange} />
}

function TestEmailRow() {
  const [to, setTo] = useState('')
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!to.trim()) {
      setStatus({ type: 'error', text: 'Enter a recipient email first.' })
      return
    }
    setSending(true)
    setStatus(null)
    try {
      await sendTestEmail(to.trim())
      setStatus({ type: 'ok', text: `Test email sent to ${to.trim()}.` })
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send test email.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="settings-field-row" style={{ borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 18, marginTop: 4 }}>
      <label htmlFor="test-email">Send a test email</label>
      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 13 }}>
        Save your SMTP settings above first, then send a test message to confirm they work.
      </p>
      <div className="settings-photo-row">
        <input
          id="test-email"
          type="email"
          placeholder="recipient@example.com"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            setStatus(null)
          }}
          style={{ flex: 1 }}
        />
        <button type="button" className="settings-save-btn" onClick={handleSend} disabled={sending}>
          {sending ? 'Sending…' : 'Send test'}
        </button>
      </div>
      {status ? (
        <span className={status.type === 'ok' ? 'settings-saved-note' : 'settings-error-note'}>
          {status.type === 'ok' ? '✓ ' : '⚠ '}
          {status.text}
        </span>
      ) : null}
    </div>
  )
}

function SettingsPanel({ config }) {
  const [values, setValues] = useState(() => defaultsFor(config.fields))
  const [fileSel, setFileSel] = useState({}) // field name -> { file, previewUrl }
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    getSettingsSection(config.section)
      .then((data) => {
        if (cancelled || !data || typeof data !== 'object') return
        setValues((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [config.section])

  const update = (field) => (e) => {
    if (field.type === 'file') {
      const file = e.target.files?.[0] || null
      setFileSel((prev) => ({ ...prev, [field.name]: file ? { file, previewUrl: URL.createObjectURL(file) } : undefined }))
      setMessage(null)
      return
    }
    const next = field.type === 'toggle' ? e.target.checked : e.target.value
    setValues((prev) => ({ ...prev, [field.name]: next }))
    setMessage(null)
  }

  const buildPayload = () => {
    const payload = {}
    config.fields.forEach((f) => {
      // Include file fields too (their stored path), so saving other fields
      // doesn't wipe an already-uploaded logo on the backend (full replace).
      payload[f.name] = values[f.name] ?? (f.type === 'toggle' ? false : '')
    })
    return payload
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await saveSettingsSection(config.section, buildPayload())
      // Upload the company logo (the only file field) if one was selected.
      if (config.section === 'general' && fileSel.company_logo?.file) {
        const updated = await uploadCompanyLogo(fileSel.company_logo.file)
        if (updated && updated.company_logo) {
          setValues((prev) => ({ ...prev, company_logo: updated.company_logo }))
        }
        setFileSel((prev) => ({ ...prev, company_logo: undefined }))
      }
      // Refresh the app header (sidebar/topbar) branding for General changes.
      if (config.section === 'general') {
        window.dispatchEvent(new Event('vm:branding-updated'))
      }
      // Refresh payment-gated UI (Payments nav, fee prompts) when payment saves.
      if (config.section === 'payment') {
        window.dispatchEvent(new Event('vm:payment-updated'))
      }
      setMessage({ type: 'ok', text: 'Saved' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save.' })
    }
  }

  // Clear the company logo so the app falls back to the default Visitor Management logo.
  const handleRemoveLogo = async () => {
    const payload = { ...buildPayload(), company_logo: '' }
    try {
      await saveSettingsSection('general', payload)
      setValues((prev) => ({ ...prev, company_logo: '' }))
      setFileSel((prev) => ({ ...prev, company_logo: undefined }))
      window.dispatchEvent(new Event('vm:branding-updated'))
      setMessage({ type: 'ok', text: 'Logo removed — using the default logo.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to remove logo.' })
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card-heading">
        <div>
          <h3>{config.heading}</h3>
          <p>{config.description}</p>
        </div>
        <div className="settings-card-icon">{config.icon}</div>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        {config.fields.map((field) => {
          if (field.type === 'file') {
            const previewSrc = fileSel[field.name]?.previewUrl || mediaUrl(values[field.name])
            const isLogo = config.section === 'general' && field.name === 'company_logo'
            const hasStoredLogo = isLogo && Boolean(values[field.name])
            return (
              <div key={field.name} className="settings-field-row settings-file-row">
                <label htmlFor={field.name}>{field.label}</label>
                <div className="settings-photo-row">
                  {previewSrc ? <img className="settings-photo-preview" src={previewSrc} alt={field.label} /> : null}
                  <input id={field.name} type="file" accept="image/*" onChange={update(field)} />
                  {hasStoredLogo ? (
                    <button type="button" className="settings-remove-btn" onClick={handleRemoveLogo}>
                      Remove logo
                    </button>
                  ) : null}
                </div>
                {isLogo ? (
                  <span style={{ color: '#64748b', fontSize: 13 }}>
                    Leave empty to use the default Visitor Management logo.
                  </span>
                ) : null}
              </div>
            )
          }
          return (
            <div key={field.name} className="settings-field-row">
              <label htmlFor={field.name}>{field.label}</label>
              <FieldControl field={field} value={values[field.name]} onChange={update(field)} />
            </div>
          )
        })}

        {config.section === 'email' ? <TestEmailRow /> : null}

        <div className="settings-actions">
          {message ? (
            <span className={message.type === 'ok' ? 'settings-saved-note' : 'settings-error-note'}>
              {message.type === 'ok' ? '✓ ' : '⚠ '}
              {message.text}
            </span>
          ) : null}
          <button type="submit" className="settings-save-btn">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function ProfilePanel() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [meta, setMeta] = useState({ username: '', role: '' })
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAccount()
      .then((data) => {
        if (cancelled || !data) return
        setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '' })
        setMeta({ username: data.username || '', role: data.role || '' })
        setPhotoUrl(mediaUrl(data.profilePhoto))
      })
      .catch((err) => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load profile.' }))
    return () => {
      cancelled = true
    }
  }, [])

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setMessage(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await updateAccountProfile(form)
      if (photoFile) {
        const updated = await uploadAccountPhoto(photoFile)
        setPhotoUrl(mediaUrl(updated?.profilePhoto))
        setPhotoFile(null)
      }
      // Tell the topbar to refresh the avatar.
      window.dispatchEvent(new Event('vm:profile-updated'))
      setMessage({ type: 'ok', text: 'Profile updated' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save.' })
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card-heading">
        <div>
          <h3>Profile</h3>
          <p>Update your basic profile information{meta.username ? ` (${meta.username} · ${meta.role})` : ''}.</p>
        </div>
        <div className="settings-card-icon">👤</div>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-field-row">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={form.name} onChange={update('name')} placeholder="Your name" />
        </div>
        <div className="settings-field-row">
          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
        </div>
        <div className="settings-field-row">
          <label htmlFor="phone">Phone Number</label>
          <input id="phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="Enter your phone number" />
        </div>

        <div className="settings-field-row settings-file-row">
          <label htmlFor="profile">Profile Photo</label>
          <div className="settings-photo-row">
            {photoUrl ? <img className="settings-photo-preview" src={photoUrl} alt="Profile" /> : null}
            <input
              id="profile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setPhotoFile(file)
                if (file) setPhotoUrl(URL.createObjectURL(file))
                setMessage(null)
              }}
            />
          </div>
        </div>

        <div className="settings-actions">
          {message ? (
            <span className={message.type === 'ok' ? 'settings-saved-note' : 'settings-error-note'}>
              {message.type === 'ok' ? '✓ ' : '⚠ '}
              {message.text}
            </span>
          ) : null}
          <button type="submit" className="settings-save-btn">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function PasswordPanel() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [message, setMessage] = useState(null)

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.next.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    if (form.next !== form.confirm) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    try {
      await changeAccountPassword({ currentPassword: form.current, newPassword: form.next })
      setForm({ current: '', next: '', confirm: '' })
      setMessage({ type: 'ok', text: 'Password updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password.' })
    }
  }

  return (
    <div className="settings-card">
      <div className="settings-card-heading">
        <div>
          <h3>Password</h3>
          <p>Change your account password.</p>
        </div>
        <div className="settings-card-icon">🔒</div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-field-row">
          <label htmlFor="current">Current Password</label>
          <input id="current" type="password" placeholder="••••••••" value={form.current} onChange={update('current')} />
        </div>
        <div className="settings-field-row">
          <label htmlFor="next">New Password</label>
          <input id="next" type="password" placeholder="At least 6 characters" value={form.next} onChange={update('next')} />
        </div>
        <div className="settings-field-row">
          <label htmlFor="confirm">Confirm New Password</label>
          <input id="confirm" type="password" placeholder="Re-enter new password" value={form.confirm} onChange={update('confirm')} />
        </div>

        <div className="settings-actions">
          {message ? (
            <span className={message.type === 'ok' ? 'settings-saved-note' : 'settings-error-note'}>
              {message.type === 'ok' ? '✓ ' : '⚠ '}
              {message.text}
            </span>
          ) : null}
          <button type="submit" className="settings-save-btn">
            Update Password
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  const canManageSettings = hasPermission(PERMISSIONS.settingsManage)
  const tabs = canManageSettings ? [...PERSONAL_TABS, ...SYSTEM_TABS] : PERSONAL_TABS

  return (
    <DashboardShell pageTitle="System Settings" breadcrumbItems={['System Settings']}>
      <section className="settings-top-card">
        <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back" style={{ marginRight: 10 }}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="settings-top-card-icon">⚙️</div>
        <div>
          <h2 className="settings-top-card-title">System Settings</h2>
          <p className="settings-top-card-text">Manage your account and system preferences.</p>
        </div>
      </section>

      <section className="settings-grid">
        <aside className="settings-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`settings-nav-item${activeTab === tab.key ? ' settings-nav-item-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <div>
                <h3>{tab.title}</h3>
                <p>{tab.subtitle}</p>
              </div>
            </button>
          ))}
        </aside>

        <div className="settings-content">
          {activeTab === 'profile' ? <ProfilePanel /> : null}
          {activeTab === 'password' ? <PasswordPanel /> : null}
          {SECTION_PANELS[activeTab] ? <SettingsPanel config={SECTION_PANELS[activeTab]} /> : null}
        </div>
      </section>
    </DashboardShell>
  )
}

export default SettingsPage
