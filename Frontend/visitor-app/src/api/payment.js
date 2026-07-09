import { getAuthToken } from '../auth/authStorage.js'
import { getApiBase } from './base.js'

const API_BASE = getApiBase()

async function requestJson(path, { method = 'GET', body } = {}) {
  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = (data && (data.message || data.error)) || ''
    } catch {
      message = await response.text().catch(() => '')
    }
    throw new Error(message || `Request failed with ${response.status}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export function listPayments() {
  return requestJson('/api/payments')
}
export function getPaymentConfig() {
  return requestJson('/api/payments/config')
}
export function createPaymentOrder(payload) {
  return requestJson('/api/payments/order', { method: 'POST', body: payload })
}
export function verifyPayment(payload) {
  return requestJson('/api/payments/verify', { method: 'POST', body: payload })
}

// Inject Razorpay's hosted checkout script once.
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const existing = document.getElementById('razorpay-checkout-js')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load the payment checkout.')))
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load the payment checkout. Check your connection.'))
    document.body.appendChild(script)
  })
}

/**
 * Collect `amount` (in major units, e.g. rupees) via Razorpay.
 * - Resolves `{ skipped: true }` when online payments aren't enabled (caller proceeds without charging).
 * - Resolves `{ paid: true, paymentId }` after a verified payment.
 * - Rejects if the user cancels or the payment/verification fails.
 */
export async function payWithRazorpay({ amount, description, prefill, visitorName, visitCategory }) {
  const cfg = await getPaymentConfig().catch(() => null)
  if (!cfg || !cfg.enabled) {
    return { skipped: true }
  }
  await loadRazorpayScript()
  const order = await createPaymentOrder({ amount, purpose: description, visitorName, visitCategory })

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Visitor Management',
      description: description || 'Visit fee',
      prefill: prefill || {},
      theme: { color: '#16a34a' },
      handler: async (response) => {
        try {
          const result = await verifyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            amount,
            purpose: description,
            visitorName,
            visitCategory,
          })
          resolve({ paid: true, paymentId: result?.paymentId })
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Payment verification failed.'))
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment was cancelled.')),
      },
    })
    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'Payment failed.'))
    })
    rzp.open()
  })
}
