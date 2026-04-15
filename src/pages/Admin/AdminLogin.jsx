import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { FaShieldAlt, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

const ADMIN_TOKEN_KEY = "smart_deals_admin_token";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      if (data.user?.role !== "admin") throw new Error("Access denied. Admin accounts only.");
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-[#1a3a5c] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#34699A]/20 border border-[#34699A]/40 mb-4">
            <FaShieldAlt className="text-3xl text-[#58A0C8]" />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-400 text-sm mt-1">SmartDeals Kuwait — Restricted Access</p>
        </div>

        <div className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Admin Email</label>
              <div className="flex items-center bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus-within:border-[#58A0C8] transition">
                <FaEnvelope className="text-gray-400 mr-3 shrink-0" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@smartdeals.kw"
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Password</label>
              <div className="flex items-center bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus-within:border-[#58A0C8] transition">
                <FaLock className="text-gray-400 mr-3 shrink-0" />
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Enter admin password"
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="text-gray-400 hover:text-gray-200 ml-2">
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : (
                <><FaShieldAlt /> Sign In as Admin</>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            This portal is for administrators only. Unauthorised access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
