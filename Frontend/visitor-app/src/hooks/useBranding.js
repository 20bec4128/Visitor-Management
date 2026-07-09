import { useEffect, useState } from 'react'

import { getBranding, mediaUrl } from '../api/config.js'
import { getAuthSession } from '../auth/authStorage.js'

/**
 * Loads the configurable company branding (name + logo) from the public branding
 * endpoint and refreshes when General settings are saved (vm:branding-updated event).
 * Falls back to the default product name when nothing is configured.
 *
 * The super admin (ADMIN role) always sees the neutral "Visitor Management" branding,
 * not the tenant's company name/logo — admin operates the system, not a single tenant.
 */
export default function useBranding() {
  const [branding, setBranding] = useState({ companyName: '', companyLogo: '' })
  const isAdmin = (getAuthSession().role ?? '').toString().toUpperCase() === 'ADMIN'

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getBranding()
        .then((data) => {
          if (cancelled || !data) return
          setBranding({ companyName: data.companyName || '', companyLogo: data.companyLogo || '' })
        })
        .catch(() => {})

    load()
    const onUpdated = () => load()
    window.addEventListener('vm:branding-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('vm:branding-updated', onUpdated)
    }
  }, [])

  if (isAdmin) {
    return { companyName: '', brandTitle: 'Visitor Management', logoUrl: '' }
  }

  return {
    companyName: branding.companyName,
    brandTitle: branding.companyName || 'Visitor Management',
    logoUrl: branding.companyLogo ? mediaUrl(branding.companyLogo) : '',
  }
}
