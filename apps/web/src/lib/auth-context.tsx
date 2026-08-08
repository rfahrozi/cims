import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  role: string;
  roles: string[];
  organizationId: string;
};

type AuthContextType = {
  user: User | null;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Read from localStorage on mount and when cims-persona-change is dispatched
    const loadUser = () => {
      const token = localStorage.getItem('cims_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: payload.id || payload.sub,
            name: payload.name,
            role: payload.role,
            roles: payload.roles || [payload.role],
            organizationId: payload.organizationId || payload.organization_ids?.[0]
          });
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    loadUser();
    window.addEventListener('cims-persona-change', loadUser);
    return () => window.removeEventListener('cims-persona-change', loadUser);
  }, []);

  const logout = () => {
    localStorage.removeItem('cims_token');
    localStorage.removeItem('cims_persona');
    setUser(null);
    window.dispatchEvent(new Event('cims-persona-change'));
  };

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
