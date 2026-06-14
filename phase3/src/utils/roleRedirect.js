export function getDashboardPathByRole(role) {
  if (role === "student") return "/student/dashboard";
  if (role === "tutor") return "/tutor/dashboard";
  if (role === "academy") return "/academy/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/unauthorized";
}
