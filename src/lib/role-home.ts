/** Oturum rolune gore ana panel yolu (yanlis panelde takili kalmayi onler). */
export function homePathForRole(role: string | undefined): string {
  switch (role) {
    case "super_admin":
      return "/admin/dashboard";
    case "coordinator":
      return "/coordinator/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "alumni":
      return "/alumni/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/";
  }
}
