import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthChecked = useAuthStore((state) => state.isAuthChecked);

  if (!isAuthChecked) {
    return <p style={{ padding: "24px" }}>Checking session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
