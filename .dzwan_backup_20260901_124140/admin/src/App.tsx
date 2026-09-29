import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Captains from "./pages/Captains";
import Establishments from "./pages/Establishments";
import Users from "./pages/Users";
import Locations from "./pages/Locations";
import Leaders from "./pages/Leaders";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Orders from "./pages/Orders";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<ProtectedRoute allowedRoles={["super_admin", "admin"]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/captains" element={<Captains />} />
          <Route path="/establishments" element={<Establishments />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/leaders" element={<Leaders />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
