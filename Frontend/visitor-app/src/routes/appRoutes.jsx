import { Navigate } from 'react-router-dom'

import ProtectedRoute from '../components/ProtectedRoute.jsx'
import SignInRoute from '../components/SignInRoute.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import ContactDiaryPage from '../pages/ContactDiaryPage.jsx'
import EmailNotificationPage from '../pages/EmailNotificationPage.jsx'
import VisitCategoryPage from '../pages/VisitCategoryPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import LoginWelcomePage from '../pages/LoginWelcomePage.jsx'
import NoticeBoardPage from '../pages/NoticeBoardPage.jsx'
import PricingPage from '../pages/PricingPage.jsx'
import PreRegisterPage from '../pages/PreRegisterPage.jsx'
import PreRegisterCreatePage from '../pages/PreRegisterCreatePage.jsx'
import PreRegisterVisitorEntryPage from '../pages/PreRegisterVisitorEntryPage.jsx'
import QRScanPage from '../pages/QRScanPage.jsx'
import OrganizationTypePage from '../pages/OrganizationTypePage.jsx'
import PaymentsPage from '../pages/PaymentsPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'
import StaffLoggedHistoryPage from '../pages/staff/StaffLoggedHistoryPage.jsx'
import StaffRolesPage from '../pages/staff/StaffRolesPage.jsx'
import StaffUsersPage from '../pages/staff/StaffUsersPage.jsx'
import SignupPage from '../pages/SignupPage.jsx'
import TodayVisitorPage from '../pages/TodayVisitorPage.jsx'
import CreateVisitorWizardPage from '../pages/CreateVisitorWizardPage.jsx'
import VisitorListPage from '../pages/VisitorListPage.jsx'
import HostApprovalListPage from '../pages/HostApprovalListPage.jsx'
import AppointmentBookingsListPage from '../pages/AppointmentBookingsListPage.jsx'
import ActiveVisitorsPage from '../pages/ActiveVisitorsPage.jsx'
import ChatPage from '../pages/ChatPage.jsx'
import SosAlertsPage from '../pages/SosAlertsPage.jsx'
import LandingPage from '../website/pages/LandingPage.jsx'
import { PERMISSIONS } from '../rbac/access.js'

export const appRoutes = [
  { path: '/', element: <LandingPage /> },
  { path: '/signin', element: <SignInRoute /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/login-welcome',
    element: (
      <ProtectedRoute>
        <LoginWelcomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/users',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.staffUsersView]}>
        <StaffUsersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/roles',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.staffRolesView]}>
        <StaffRolesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/logged-history',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.staffLoggedHistoryView]}>
        <StaffLoggedHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/visitors',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitorsView]}>
        <VisitorListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/visitors/create',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitorsCreate]}>
        <CreateVisitorWizardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pre-register-entry/:token',
    element: (
      <ProtectedRoute>
        <PreRegisterVisitorEntryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/visitors/qr-scan',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitsCheckin]}>
        <QRScanPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/preregister',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.preregisterView]}>
        <PreRegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/preregister/create',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.preregisterManage]}>
        <PreRegisterCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/preregister/create/:id',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.preregisterManage]}>
        <PreRegisterCreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/today-visitor',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitsView]}>
        <TodayVisitorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/active-visitors',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitsCheckout]}>
        <ActiveVisitorsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/contact-diary',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.contactView]}>
        <ContactDiaryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notice-board',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.noticeView]}>
        <NoticeBoardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/host-approvals',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitsView]}>
        <HostApprovalListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/appointment-bookings',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.preregisterView]}>
        <AppointmentBookingsListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/visit-category',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.visitCategoryManage]}>
        <VisitCategoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/organization-types',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.organizationTypeManage]}>
        <OrganizationTypePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/email-notification',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.emailNotificationManage]}>
        <EmailNotificationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pricing',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.pricingManage]}>
        <PricingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/payments',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.paymentsView]}>
        <PaymentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.chatUse]}>
        <ChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/sos-alerts',
    element: (
      <ProtectedRoute requiredPermissions={[PERMISSIONS.sosView]}>
        <SosAlertsPage />
      </ProtectedRoute>
    ),
  },
  {
    // Any logged-in user can reach Settings; the page itself gates which tabs
    // appear (everyone gets Profile + Password, settings.manage unlocks the rest).
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]
