import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdvanceSearch from "./pages/AdvanceSearch";
import ProtectedRoute from "./components/ProtectedRoute";
import Stargazing from "./pages/Stargazing";
import History from "./pages/History";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/advance"
        element={
          <ProtectedRoute>
            <AdvanceSearch />
          </ProtectedRoute>
        }
      />
      <Route path="/stargazing" element={<Stargazing />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
};

export default App;
