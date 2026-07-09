import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import { IconPencil, IconTrash } from '../components/dashboard/ActionIcons.jsx'
import './VisitorListPage.css'
import './PricingPage.css'

const STORAGE_KEY = 'vms.pricingPlans'

const samplePlans = [
  {
    id: 1,
    name: 'Starter',
    price: 0,
    period: 'month',
    visitorLimit: '100 visitors / month',
    features: ['Visitor check-in & check-out', 'Basic dashboard', 'Email support'],
    popular: false,
    active: true,
  },
  {
    id: 2,
    name: 'Professional',
    price: 49,
    period: 'month',
    visitorLimit: '2,000 visitors / month',
    features: [
      'Everything in Starter',
      'Pre-registration & QR check-in',
      'Host approvals',
      'Face recognition',
      'Priority support',
    ],
    popular: true,
    active: true,
  },
  {
    id: 3,
    name: 'Enterprise',
    price: 199,
    period: 'month',
    visitorLimit: 'Unlimited visitors',
    features: [
      'Everything in Professional',
      'Multi-location support',
      'Custom roles & permissions',
      'API access',
      'Dedicated account manager',
    ],
    popular: false,
    active: true,
  },
]

const emptyForm = {
  name: '',
  price: '',
  period: 'month',
  visitorLimit: '',
  features: '',
  popular: false,
  active: true,
}

function PricingPage() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [plans, setPlans] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore malformed storage
    }
    return samplePlans
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
    } catch {
      // ignore quota errors
    }
  }, [plans])

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(a.price) - Number(b.price)),
    [plans],
  )

  const handleField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      price: String(plan.price ?? ''),
      period: plan.period || 'month',
      visitorLimit: plan.visitorLimit || '',
      features: (plan.features || []).join('\n'),
      popular: Boolean(plan.popular),
      active: plan.active !== false,
    })
    setShowModal(true)
  }

  const handleDelete = (plan) => {
    if (!window.confirm(`Delete the "${plan.name}" plan?`)) return
    setPlans((prev) => prev.filter((p) => p.id !== plan.id))
  }

  const handleSubmit = () => {
    const features = form.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
    const payload = {
      name: form.name || 'Untitled Plan',
      price: Number(form.price) || 0,
      period: form.period,
      visitorLimit: form.visitorLimit,
      features,
      popular: form.popular,
      active: form.active,
    }
    if (editingId != null) {
      setPlans((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload } : p)))
    } else {
      const newId = plans.length ? Math.max(...plans.map((p) => p.id)) + 1 : 1
      setPlans((prev) => [...prev, { id: newId, ...payload }])
    }
    closeModal()
  }

  return (
    <DashboardShell pageTitle="Pricing" breadcrumbItems={['System Settings', 'Pricing']}>
      <section className="vm-card">
        <div className="vm-card-head">
          <div className="vm-card-head-left">
            <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h2>Pricing Plans</h2>
          </div>
          <div className="vm-visitor-head-actions">
            <button type="button" className="vm-btn vm-btn-orange" onClick={openAdd}>
              + Add Plan
            </button>
          </div>
        </div>

        <div className="vm-pricing-grid">
          {sortedPlans.length === 0 ? (
            <div className="vm-pricing-empty">No pricing plans yet. Click “Add Plan” to create one.</div>
          ) : (
            sortedPlans.map((plan) => (
              <div key={plan.id} className={`vm-plan-card${plan.popular ? ' is-popular' : ''}`}>
                {plan.popular ? <span className="vm-plan-badge">Most Popular</span> : null}

                <div className="vm-plan-head">
                  <h3 className="vm-plan-name">{plan.name}</h3>
                  <span className={`vm-plan-status vm-plan-status-${plan.active === false ? 'off' : 'on'}`}>
                    {plan.active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>

                <div className="vm-plan-price">
                  <span className="vm-plan-amount">₹{Number(plan.price).toLocaleString()}</span>
                  <span className="vm-plan-period">/ {plan.period}</span>
                </div>

                {plan.visitorLimit ? <div className="vm-plan-limit">{plan.visitorLimit}</div> : null}

                <ul className="vm-plan-features">
                  {(plan.features || []).map((feature, i) => (
                    <li key={i}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="vm-plan-actions">
                  <button type="button" className="vm-action-btn vm-action-edit" aria-label="Edit" onClick={() => openEdit(plan)}>
                    <IconPencil />
                  </button>
                  <button type="button" className="vm-action-btn vm-action-del" aria-label="Delete" onClick={() => handleDelete(plan)}>
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && createPortal(
        <div className="vm-modal-overlay" onClick={closeModal}>
          <div className="vm-modal-content vm-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal-header">
              <h3>{editingId != null ? 'Edit Plan' : 'Add Plan'}</h3>
              <button type="button" className="vm-modal-close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>
            <form className="vm-contact-form" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="name">Plan Name</label>
                  <input id="name" type="text" value={form.name} onChange={handleField('name')} placeholder="e.g. Professional" required />
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group">
                  <label htmlFor="price">Price (₹)</label>
                  <input id="price" type="number" min="0" value={form.price} onChange={handleField('price')} placeholder="0" />
                </div>
                <div className="vm-form-group">
                  <label htmlFor="period">Billing Period</label>
                  <select id="period" value={form.period} onChange={handleField('period')} className="vm-plan-select">
                    <option value="month">Per Month</option>
                    <option value="year">Per Year</option>
                  </select>
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="visitorLimit">Visitor Limit</label>
                  <input id="visitorLimit" type="text" value={form.visitorLimit} onChange={handleField('visitorLimit')} placeholder="e.g. 2,000 visitors / month or Unlimited" />
                </div>
              </div>

              <div className="vm-form-row">
                <div className="vm-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="features">Features (one per line)</label>
                  <textarea id="features" rows={5} value={form.features} onChange={handleField('features')} placeholder={'Visitor check-in\nQR check-in\nPriority support'} className="vm-plan-textarea" />
                </div>
              </div>

              <div className="vm-form-row vm-plan-toggles">
                <label className="vm-plan-check">
                  <input type="checkbox" checked={form.popular} onChange={handleField('popular')} />
                  <span>Mark as “Most Popular”</span>
                </label>
                <label className="vm-plan-check">
                  <input type="checkbox" checked={form.active} onChange={handleField('active')} />
                  <span>Active</span>
                </label>
              </div>

              <div className="vm-modal-actions">
                <button type="button" className="vm-btn vm-btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="vm-btn vm-btn-orange">
                  {editingId != null ? 'Update Plan' : 'Add Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </DashboardShell>
  )
}

export default PricingPage
