import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const dni = localStorage.getItem("dni");

  if (!dni) {
    return <Navigate to="/" />;
  }

  return children;
}