import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as loginApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("injuryguard_token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("injuryguard_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await loginApi(email, password);
    localStorage.setItem("injuryguard_token", res.data.access_token);
    const me = await getMe();
    setUser(me.data);
    return me.data;
  }

  function logout() {
    localStorage.removeItem("injuryguard_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
