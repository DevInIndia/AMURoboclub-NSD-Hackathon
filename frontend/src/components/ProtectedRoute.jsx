import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Auth0 needs a moment to restore the session on a cold load; redirecting
  // before it settles would bounce signed-in users to the login page.
  if (isLoading) return <LoadingScreen message="Checking your credentials" />;

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
