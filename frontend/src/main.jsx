import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import MissingAuthConfig from "./pages/MissingAuthConfig.jsx";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const Auth0ProviderWithNavigation = ({ children }) => {
  const navigate = useNavigate();

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
      }}
      // Silent renewal through a hidden iframe needs third-party cookies,
      // which embedded and privacy-focused browsers block. Refresh tokens in
      // local storage keep the session alive in those browsers too.
      useRefreshTokens
      cacheLocation="localstorage"
      // Send the user back to whatever page sent them to log in.
      onRedirectCallback={(appState) =>
        navigate(appState?.returnTo || "/", { replace: true })
      }
    >
      {children}
    </Auth0Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    {domain && clientId && audience ? (
      <Auth0ProviderWithNavigation>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Auth0ProviderWithNavigation>
    ) : (
      // Without these the SDK throws an opaque error on first render, so say
      // plainly what is missing instead.
      <MissingAuthConfig
        missing={[
          !domain && "VITE_AUTH0_DOMAIN",
          !clientId && "VITE_AUTH0_CLIENT_ID",
          !audience && "VITE_AUTH0_AUDIENCE",
        ].filter(Boolean)}
      />
    )}
  </BrowserRouter>
);
