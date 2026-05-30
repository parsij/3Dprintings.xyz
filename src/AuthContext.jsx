/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from "react";

const AuthContext = createContext(undefined);

export function AuthProvider({ children, user, setUser }) {
  const value = useMemo(() => ({ user, setUser }), [user, setUser]);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
