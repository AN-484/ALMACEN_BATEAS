import { Navigate } from "react-router-dom";
import SessionTimeout from "./SessionTimeout";

export default function ProtectedRoute({ children }) {
  const dni = localStorage.getItem("dni");

  if (!dni) {
    return <Navigate to="/" />;
  }

  return (
    <SessionTimeout>
      {children}
    </SessionTimeout>
  );
}