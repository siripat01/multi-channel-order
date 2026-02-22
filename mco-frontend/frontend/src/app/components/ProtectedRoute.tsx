import { Navigate, Outlet } from "react-router";

export function ProtectedRoute() {
  const authSession = localStorage.getItem("auth_session");

  if (!authSession) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
