/** Oturum rolune gore ana panel yolu (yanlis panelde takili kalmayi onler). */
export function homePathForRole(role: string | undefined): string {
  switch (role) {
    case "super_admin":
      return "/panel/dashboard";
    case "coordinator":
      return "/panel/dashboard";
    case "staff":
      return "/panel/dashboard";
    case "alumni":
      return "/alumni/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/";
  }
}
