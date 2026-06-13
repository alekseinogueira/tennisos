import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import RoleRoute from './auth/RoleRoute'
import Layout from './components/Layout'

import Login from './screens/Login'
import ForgotPassword from './screens/ForgotPassword'
import ResetPassword from './screens/ResetPassword'
import ClaimInvite from './screens/ClaimInvite'
import ComingSoon from './screens/ComingSoon'
import StudentDashboard from './screens/StudentDashboard'
import Profile from './screens/Profile'
import Feedbacks from './screens/Feedbacks'
import AdminHome from './screens/admin/AdminHome'
import Students from './screens/admin/Students'
import StudentDetail from './screens/admin/StudentDetail'
import StudentForm from './screens/admin/StudentForm'
import FeedbackComposer from './screens/admin/FeedbackComposer'
import Videos from './screens/admin/Videos'
import FeedbackDetail from './screens/admin/FeedbackDetail'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/claim" element={<ClaimInvite />} />

          {/* Authenticated routes — gated, then wrapped in the branded shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<StudentDashboard />} />
              <Route path="/feedback" element={<Feedbacks />} />
              <Route path="/profile" element={<Profile />} />
              <Route element={<RoleRoute allow={['coach', 'admin']} />}>
                <Route path="/coach" element={<ComingSoon title="Coach Home" />} />
                {/* Admin panel — coach/admin only; students are bounced to / by RoleRoute */}
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/students" element={<Students />} />
                <Route path="/admin/students/new" element={<StudentForm />} />
                <Route path="/admin/students/:id" element={<StudentDetail />} />
                <Route path="/admin/students/:id/edit" element={<StudentForm />} />
                <Route
                  path="/admin/students/:id/feedback/new"
                  element={<FeedbackComposer />}
                />
                <Route
                  path="/admin/students/:id/feedback/:fid"
                  element={<FeedbackDetail />}
                />
                <Route path="/admin/videos" element={<Videos />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
