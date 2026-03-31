import { useEffect, useState } from "react";
import AuthPage from "./components/AuthPage";
import MapView from "./components/MapView";
import SplashScreen from "./components/SplashScreen";
import { api } from "./services/api";
import type { AuthSession } from "./services/api";
import "./styles/theme.css";
import "./App.css";

const AUTH_STORAGE_KEY = "vwanou.authSession";

function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as AuthSession;
      if (!parsed.token || !parsed.user?.id) {
        throw new Error("Invalid session payload");
      }
      setAuthSession(parsed);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    setAuthSession(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  };

  const handleSignOut = () => {
    setAuthSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    api.setUnauthorizedHandler(handleSignOut);
    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, []);

  return (
    <>
      <SplashScreen />
      {!authSession ? (
        <AuthPage onAuthenticated={handleAuthenticated} />
      ) : (
        <MapView currentUser={authSession.user} authToken={authSession.token} onSignOut={handleSignOut} />
      )}
    </>
  );
}

export default App;
