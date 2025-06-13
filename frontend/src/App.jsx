import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdvanceSearch from "./pages/AdvanceSearch";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/advance"
        element={
          <ProtectedRoute>
            <AdvanceSearch />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
};

export default App;
