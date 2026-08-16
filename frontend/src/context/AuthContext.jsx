import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const AuthContext = createContext();

/**
 * Thin wrapper over Auth0 so the rest of the app never imports the SDK
 * directly, and so `getToken()` is the single way to obtain the access token
 * that the backend verifies.
 */
export const AuthProvider = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  // Auth0 caches and refreshes the access token itself; always ask for it at
  // call time rather than holding a copy that can go stale.
  const getToken = useCallback(
    () => getAccessTokenSilently(),
    [getAccessTokenSilently]
  );

  const login = useCallback(
    (returnTo = window.location.pathname) =>
      loginWithRedirect({ appState: { returnTo } }),
    [loginWithRedirect]
  );

  // Universal Login shows the sign-up form first when asked to.
  const signup = useCallback(
    (returnTo = "/") =>
      loginWithRedirect({
        appState: { returnTo },
        authorizationParams: { screen_hint: "signup" },
      }),
    [loginWithRedirect]
  );

  const signOut = useCallback(
    () => logout({ logoutParams: { returnTo: window.location.origin } }),
    [logout]
  );

  const value = useMemo(
    () => ({ user, isAuthenticated, isLoading, getToken, login, signup, signOut }),
    [user, isAuthenticated, isLoading, getToken, login, signup, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
