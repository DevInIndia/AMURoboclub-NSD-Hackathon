import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdvanceSearch from "./pages/AdvanceSearch";
import ProtectedRoute from "./components/ProtectedRoute";
import Stargazing from "./pages/Stargazing";
import History from "./pages/History";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/stargazing" element={<Stargazing />} />
      <Route
        path="/advance"
        element={
          <ProtectedRoute>
            <AdvanceSearch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
