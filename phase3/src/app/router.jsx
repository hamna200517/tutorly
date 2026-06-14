import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../routes/ProtectedRoute";
import RoleRoute from "../routes/RoleRoute";
import { meRequest } from "../api/auth";
import useAuthStore from "../store/authStore";
import { getDashboardPathByRole } from "../utils/roleRedirect";

import LoginPage from "../pages/public/LoginPage";
import RegisterPage from "../pages/public/RegisterPage";
import ForgotPasswordPage from "../pages/public/ForgotPasswordPage";
import ResetPasswordPage from "../pages/public/ResetPasswordPage";
import UnauthorizedPage from "../pages/public/UnauthorizedPage";

import StudentDashboard from "../pages/student/StudentDashboard";
import StudentTutorsPage from "../pages/student/StudentTutorsPage";
import StudentAcademiesPage from "../pages/student/StudentAcademiesPage";
import StudentWalletPage from "../pages/student/StudentWalletPage";
import StudentBookingsPage from "../pages/student/StudentBookingsPage";
import StudentChatPage from "../pages/student/StudentChatPage";
import StudentReviewsPage from "../pages/student/StudentReviewsPage";
import TutorDashboard from "../pages/tutor/TutorDashboard";
import TutorSubscriptionPage from "../pages/tutor/TutorSubscriptionPage";
import TutorBookingsPage from "../pages/tutor/TutorBookingsPage";
import TutorWithdrawalsPage from "../pages/tutor/TutorWithdrawalsPage";
import TutorReviewsPage from "../pages/tutor/TutorReviewsPage";
import TutorChatPage from "../pages/tutor/TutorChatPage";
import AcademyDashboard from "../pages/academy/AcademyDashboard";
import AcademySubscriptionPage from "../pages/academy/AcademySubscriptionPage";
import AcademyCoursesPage from "../pages/academy/AcademyCoursesPage";
import AcademyEnrollmentsPage from "../pages/academy/AcademyEnrollmentsPage";
import AcademyChatPage from "../pages/academy/AcademyChatPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminWithdrawalsPage from "../pages/admin/AdminWithdrawalsPage";

export default function AppRouter() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const setAuthChecked = useAuthStore((state) => state.setAuthChecked);

  useEffect(() => {
    async function hydrateFromMe() {
      if (!accessToken) {
        setAuthChecked(true);
        return;
      }

      try {
        const meData = await meRequest();
        setUserProfile({
          user: {
            email: meData.email,
            account_id: meData.account_id,
            profile: meData.profile,
          },
          role: meData.role,
        });
      } catch {
        clearSession();
      } finally {
        setAuthChecked(true);
      }
    }

    hydrateFromMe();
  }, [accessToken, clearSession, setAuthChecked, setUserProfile]);

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={accessToken && role ? getDashboardPathByRole(role) : "/login"} replace />}
      />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={["student"]} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/tutors" element={<StudentTutorsPage />} />
          <Route path="/student/academies" element={<StudentAcademiesPage />} />
          <Route path="/student/wallet" element={<StudentWalletPage />} />
          <Route path="/student/bookings" element={<StudentBookingsPage />} />
          <Route path="/student/chat" element={<StudentChatPage />} />
          <Route path="/student/reviews" element={<StudentReviewsPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["tutor"]} />}>
          <Route path="/tutor/dashboard" element={<TutorDashboard />} />
          <Route path="/tutor/subscription" element={<TutorSubscriptionPage />} />
          <Route path="/tutor/bookings" element={<TutorBookingsPage />} />
          <Route path="/tutor/withdrawals" element={<TutorWithdrawalsPage />} />
          <Route path="/tutor/reviews" element={<TutorReviewsPage />} />
          <Route path="/tutor/chat" element={<TutorChatPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["academy"]} />}>
          <Route path="/academy/dashboard" element={<AcademyDashboard />} />
          <Route path="/academy/subscription" element={<AcademySubscriptionPage />} />
          <Route path="/academy/courses" element={<AcademyCoursesPage />} />
          <Route path="/academy/enrollments" element={<AcademyEnrollmentsPage />} />
          <Route path="/academy/chat" element={<AcademyChatPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
}
