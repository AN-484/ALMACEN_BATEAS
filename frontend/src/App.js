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
import Maestros from "./pages/Maestros";
import EPPS from "./pages/EPPS";

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
                <EPPS />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;