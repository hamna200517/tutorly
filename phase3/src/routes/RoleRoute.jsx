import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function RoleRoute({ allowedRoles }) {
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
