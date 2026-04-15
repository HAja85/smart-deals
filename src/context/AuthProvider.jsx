import React, { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import Swal from "sweetalert2";

const TOKEN_KEY = "smart_deals_token";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");

  const setLoadingSystem = (state = true, delay = 2000) => {
    setLoading(state);
    if (state) setTimeout(() => setLoading(false), delay);
  };

  const buildUser = (userData, token) => ({
    ...userData,
    accessToken: token,
    getIdToken: () => Promise.resolve(token),
  });

  const storeSession = (userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    const u = buildUser(userData, token);
    setUser(u);
    return u;
  };

  const createUser = (email, password, name, photoURL, role = "consumer") => {
    setLoading(true);
    return fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name, image: photoURL, role }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(new Error(e.detail)));
        return res.json();
      })
      .then(({ user: userData, token }) => storeSession(userData, token))
      .finally(() => setLoading(false));
  };

  const loginUser = (email, password) => {
    setLoading(true);
    return fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(new Error(e.detail)));
        return res.json();
      })
      .then(({ user: userData, token }) => storeSession(userData, token))
      .finally(() => setLoading(false));
  };

  const logoutUser = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7C3AED",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Logout",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        Swal.fire({ icon: "success", title: "Logged Out!", showConfirmButton: false, timer: 1500 });
      } else {
        Swal.close();
      }
    });
  };

  const updateUserProfile = async () => {
    Swal.fire({ icon: "info", title: "Coming Soon", text: "Profile updates will be available soon." });
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetch("/api/auth/me", { headers: { authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) throw new Error("Invalid session"); return res.json(); })
      .then((userData) => setUser(buildUser(userData, token)))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const authInfo = {
    user, loading, setLoading: setLoadingSystem,
    createUser, loginUser, logoutUser,
    emailInput, setEmailInput, updateUserProfile,
  };

  return <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
