export const PERMISSIONS = {
  staffUsersView: 'staff.users.view',
  staffUsersCreate: 'staff.users.create',
  staffUsersEdit: 'staff.users.edit',
  staffUsersDelete: 'staff.users.delete',
  staffRolesView: 'staff.roles.view',
  staffRolesManage: 'staff.roles.manage',
  staffLoggedHistoryView: 'staff.logged-history.view',
  staffLoggedHistoryDelete: 'staff.logged-history.delete',
  visitorsView: 'visitors.view',
  visitorsCreate: 'visitors.create',
  visitorsEdit: 'visitors.edit',
  visitorsDelete: 'visitors.delete',
  visitorsFaceMatch: 'visitors.face.match',
  visitsView: 'visits.view',
  visitsCreate: 'visits.create',
  visitsEdit: 'visits.edit',
  visitsDelete: 'visits.delete',
  visitsApprove: 'visits.approve',
  visitsReject: 'visits.reject',
  visitsCheckin: 'visits.checkin',
  visitsCheckout: 'visits.checkout',
  preregisterView: 'preregister.view',
  preregisterManage: 'preregister.manage',
  preregisterApprove: 'preregister.approve',
  preregisterReject: 'preregister.reject',
  preregisterEntry: 'preregister.entry',
  contactView: 'contact.view',
  noticeView: 'notice.view',
  noticeManage: 'notice.manage',
  visitCategoryManage: 'visit-category.manage',
  organizationTypeManage: 'organization-type.manage',
  emailNotificationManage: 'email-notification.manage',
  pricingManage: 'pricing.manage',
  paymentsView: 'payments.view',
  settingsManage: 'settings.manage',
  chatUse: 'chat.use',
  chatChannelsManage: 'chat.channels.manage',
  sosView: 'sos.view',
  sosResolve: 'sos.resolve',
}

export const ROUTE_PERMISSIONS = [
  { path: '/dashboard', permissions: [] },
  { path: '/staff/users', permissions: [PERMISSIONS.staffUsersView] },
  { path: '/staff/roles', permissions: [PERMISSIONS.staffRolesView] },
  { path: '/staff/logged-history', permissions: [PERMISSIONS.staffLoggedHistoryView] },
  { path: '/visitors', permissions: [PERMISSIONS.visitorsView] },
  { path: '/visitors/create', permissions: [PERMISSIONS.visitorsCreate] },
  { path: '/pre-register-entry/:token', permissions: [] },
  { path: '/visitors/qr-scan', permissions: [PERMISSIONS.visitsCheckin] },
  { path: '/preregister', permissions: [PERMISSIONS.preregisterManage] },
  { path: '/preregister/create', permissions: [PERMISSIONS.preregisterManage] },
  { path: '/preregister/create/:id', permissions: [PERMISSIONS.preregisterManage] },
  { path: '/today-visitor', permissions: [PERMISSIONS.visitsView] },
  { path: '/active-visitors', permissions: [PERMISSIONS.visitsCheckout] },
  { path: '/contact-diary', permissions: [PERMISSIONS.contactView] },
  { path: '/notice-board', permissions: [PERMISSIONS.noticeView] },
  { path: '/host-approvals', permissions: [PERMISSIONS.visitsView] },
  { path: '/appointment-bookings', permissions: [PERMISSIONS.preregisterView] },
  { path: '/visit-category', permissions: [PERMISSIONS.visitCategoryManage] },
  { path: '/organization-types', permissions: [PERMISSIONS.organizationTypeManage] },
  { path: '/email-notification', permissions: [PERMISSIONS.emailNotificationManage] },
  { path: '/pricing', permissions: [PERMISSIONS.pricingManage] },
  { path: '/payments', permissions: [PERMISSIONS.paymentsView] },
  { path: '/chat', permissions: [PERMISSIONS.chatUse] },
  { path: '/sos-alerts', permissions: [PERMISSIONS.sosView] },
  { path: '/settings', permissions: [] },
]

export function findRoutePermissions(pathname) {
  const path = pathname || ''
  const match = ROUTE_PERMISSIONS.find((route) => {
    if (!route.path.includes(':')) {
      return path === route.path || path.startsWith(`${route.path}/`)
    }
    const basePath = route.path.split('/:')[0]
    return path === basePath || path.startsWith(`${basePath}/`)
  })
  return match?.permissions ?? []
}
