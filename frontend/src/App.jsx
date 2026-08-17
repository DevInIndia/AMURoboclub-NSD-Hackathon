import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";

/**
 * Route-level code splitting.
 *
 * Home and the two auth pages load eagerly: they are the entry points, and
 * deferring them would only add a spinner to the first paint. Everything else
 * is fetched on navigation.
 *
 * The heavy pages are heavy for different reasons -- the classifier ships the
 * H-R diagram plus the 240-star reference set, Stargazing carries three live
 * data widgets, and the archive pulls in the markdown renderer and sanitiser.
 * A visitor who only asks a question should not download any of it.
 */
const AdvanceSearch = lazy(() => import("./pages/AdvanceSearch"));
const Exoplanet = lazy(() => import("./pages/Exoplanet"));
const Stargazing = lazy(() => import("./pages/Stargazing"));
const History = lazy(() => import("./pages/History"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <Suspense fallback={<LoadingScreen message="Loading" />}>
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
        path="/exoplanet"
        element={
          <ProtectedRoute>
            <Exoplanet />
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
  </Suspense>
);

export default App;
