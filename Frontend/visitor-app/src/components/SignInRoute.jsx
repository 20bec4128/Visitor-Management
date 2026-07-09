import { useLocation, Navigate } from 'react-router-dom'
import SignInPage from '../website/pages/SignInPage.jsx'
import SignupPage from '../pages/SignupPage.jsx'

const SignInRoute = () => {
  const location = useLocation()

  // Only allow access to SignIn if coming from landing page (state exists) or if already authenticated
  if (location.state?.fromLanding) {
    return <SignupPage />
  }

  // Redirect to landing page if trying to access /signin directly
  return <Navigate to="/" replace />
}

export default SignInRoute
