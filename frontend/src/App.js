/*import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SMDS from "./pages/SMDS";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f6fa",
        minHeight: "100vh",
        padding: "20px"
      }}
    >
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smds"
          element={
            <ProtectedRoute>
              <SMDS />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;*/


import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SMDS from "./pages/SMDS";
import Cilindros from "./pages/Cilindros";
import ProtectedRoute from "./components/ProtectedRoute";
import EPPS from "./pages/EPPS";
import Guias from "./pages/Guias";
import Leasing from "./pages/leasing/Leasing";
import AdminMaterialesLeasing from "./pages/leasing/AdminMaterialesLeasing";
import HistorialLeasing from "./pages/leasing/HistorialLeasing";

function App() {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f6fa",
        minHeight: "100vh"
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/smds"
            element={
              <ProtectedRoute>
                <SMDS />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cilindros"
            element={
              <ProtectedRoute>
                <Cilindros />
              </ProtectedRoute>
            }
          />

          <Route
            path="/epps"
            element={
              <ProtectedRoute>
                < EPPS />
              </ProtectedRoute>
            }
          />

          <Route
            path="/guias"
            element={
              <ProtectedRoute>
                <Guias />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing"
            element={
              <ProtectedRoute>
                <Leasing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/ingresos"
            element={
              <ProtectedRoute>
                <Leasing funcionInicial="101" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/salidas"
            element={
              <ProtectedRoute>
                <Leasing funcionInicial="201" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/modificaciones"
            element={
              <ProtectedRoute>
                <Leasing funcionInicial="301" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/eliminaciones"
            element={
              <ProtectedRoute>
                <Leasing funcionInicial="401" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/admin-materiales"
            element={
              <ProtectedRoute>
                <AdminMaterialesLeasing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leasing/historial"
            element={
              <ProtectedRoute>
                <HistorialLeasing />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;