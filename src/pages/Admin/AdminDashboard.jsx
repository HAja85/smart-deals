import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  FaShieldAlt, FaUsers, FaUserPlus, FaPhone, FaEnvelope, FaLock,
  FaStore, FaShoppingCart, FaCheckCircle, FaTimesCircle, FaTrash,
  FaSignOutAlt, FaKey, FaSearch, FaUserCircle, FaSync,
} from "react-icons/fa";

const ADMIN_TOKEN_KEY = "smart_deals_admin_token";

const roleBadge = (role) => {
  if (role === "admin") return "bg-purple-100 text-purple-700";
  if (role === "supplier") return "bg-emerald-100 text-emerald-700";
  return "bg-blue-100 text-blue-700";
};

const roleIcon = (role) => {
  if (role === "supplier") return <FaStore className="inline mr-1" />;
  if (role === "admin") return <FaShieldAlt className="inline mr-1" />;
  return <FaShoppingCart className="inline mr-1" />;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consumer", mobile: "", image: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [tab, setTab] = useState("users");

  useEffect(() => {
    const t = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!t) { navigate("/admin", { replace: true }); return; }
    setToken(t);
  }, [navigate]);

  const authHeaders = useCallback(() => ({
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  }), [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    finally { setLoadingUsers(false); }
  }, [token, authHeaders]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/stats", { headers: authHeaders() });
      const data = await res.json();
      setStats(data);
    } catch { }
  }, [token, authHeaders]);

  useEffect(() => {
    if (token) { fetchUsers(); fetchStats(); }
  }, [token, fetchUsers, fetchStats]);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin", { replace: true });
  };

  const handleSendOtp = async () => {
    if (!form.mobile.trim()) { setFormError("Mobile number is required to send OTP"); return; }
    setFormError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/admin/send-otp", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ mobile_number: form.mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setOtpSent(true);
      setDemoOtp(data.otp);
    } catch (err) {
      setFormError(err.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!otpSent) { setFormError("Please send and verify the OTP first"); return; }
    if (!otpInput.trim()) { setFormError("Please enter the OTP"); return; }
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!pwRegex.test(form.password)) {
      setFormError("Password must include uppercase, lowercase, and a number (min 6 chars)");
      return;
    }
    setFormError(""); setFormSuccess(""); setFormLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          role: form.role, mobile_number: form.mobile, otp: otpInput,
          image: form.image || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setFormSuccess(`User "${form.name}" created successfully as ${form.role}!`);
      setForm({ name: "", email: "", password: "", role: "consumer", mobile: "", image: "" });
      setOtpSent(false); setDemoOtp(""); setOtpInput("");
      fetchUsers(); fetchStats();
    } catch (err) {
      setFormError(err.message || "Failed to create user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      fetchUsers(); fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = usersSearch.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      || u.role?.toLowerCase().includes(q) || u.mobile_number?.includes(q);
  });

  const statCards = stats ? [
    { label: "Total Users", value: stats.total, color: "text-white", bg: "from-[#34699A] to-[#58A0C8]" },
    { label: "Consumers", value: stats.by_role?.consumer ?? 0, color: "text-white", bg: "from-blue-500 to-blue-600" },
    { label: "Suppliers", value: stats.by_role?.supplier ?? 0, color: "text-white", bg: "from-emerald-500 to-emerald-600" },
    { label: "Verified", value: stats.verified, color: "text-white", bg: "from-teal-500 to-teal-600" },
    { label: "New This Week", value: stats.new_this_week, color: "text-white", bg: "from-violet-500 to-violet-600" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34699A]/30 flex items-center justify-center">
              <FaShieldAlt className="text-[#58A0C8]" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">SmartDeals Admin</span>
              <span className="ml-2 text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">Kuwait</span>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-gray-700">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.bg} rounded-2xl p-4 text-center shadow`}>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value?.toLocaleString()}</p>
                <p className="text-white/80 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {[
            { id: "users", label: "User List", icon: <FaUsers /> },
            { id: "create", label: "Add User", icon: <FaUserPlus /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition ${
                tab === t.id ? "bg-[#34699A] text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-[#34699A]"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2">
                <FaSearch className="text-gray-400 shrink-0" />
                <input value={usersSearch} onChange={e => setUsersSearch(e.target.value)}
                  placeholder="Search by name, email, role, mobile…"
                  className="flex-1 outline-none text-sm text-gray-700 bg-transparent" />
              </div>
              <button onClick={() => { fetchUsers(); fetchStats(); }}
                className="p-2 text-gray-400 hover:text-[#34699A] transition" title="Refresh">
                <FaSync />
              </button>
              <span className="text-xs text-gray-400">{filteredUsers.length} users</span>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400">Loading users…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Role</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Verified</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Joined</th>
                      <th className="px-4 py-3 font-semibold text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {u.image
                              ? <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                              : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34699A] to-[#58A0C8] flex items-center justify-center shrink-0">
                                  <FaUserCircle className="text-white text-sm" />
                                </div>
                            }
                            <div>
                              <p className="font-medium text-gray-800 text-xs">{u.name}</p>
                              <p className="text-gray-400 text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                          {u.mobile_number || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge(u.role)}`}>
                            {roleIcon(u.role)}{u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.is_verified
                            ? <FaCheckCircle className="text-emerald-500 mx-auto" />
                            : <FaTimesCircle className="text-gray-300 mx-auto" />}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("en-KW", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {u.role !== "admin" && (
                            <button onClick={() => handleDeleteUser(u)} title="Delete user"
                              className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-xs">
                              <FaTrash />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "create" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <FaUserPlus className="text-[#34699A]" /> Add New User
              </h2>
              <p className="text-gray-500 text-sm mb-6">Mobile number must be verified via OTP before the account is created.</p>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{formError}</div>
              )}
              {formSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                  <FaCheckCircle /> {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="flex gap-2 mb-2">
                  {["consumer", "supplier"].map(r => (
                    <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium border-2 transition text-sm ${
                        form.role === r
                          ? r === "supplier" ? "bg-emerald-600 text-white border-emerald-600" : "bg-[#34699A] text-white border-[#34699A]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                      {r === "supplier" ? <FaStore /> : <FaShoppingCart />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required placeholder="Enter full name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#34699A] transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#34699A] transition">
                    <FaEnvelope className="text-gray-400 mr-2 shrink-0" />
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required placeholder="user@example.com"
                      className="flex-1 outline-none text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex items-center border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#34699A] transition">
                    <FaLock className="text-gray-400 mr-2 shrink-0" />
                    <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required placeholder="Min 6 chars, upper + lower + number"
                      className="flex-1 outline-none text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                    placeholder="https://…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#34699A] transition" />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-2.5 flex-1 focus-within:border-[#34699A] transition">
                      <FaPhone className="text-gray-400 mr-2 shrink-0" />
                      <input value={form.mobile} onChange={e => { setForm(f => ({ ...f, mobile: e.target.value })); setOtpSent(false); setDemoOtp(""); setOtpInput(""); }}
                        required placeholder="+965 XXXX XXXX"
                        className="flex-1 outline-none text-sm" />
                    </div>
                    <button type="button" onClick={handleSendOtp} disabled={otpLoading || !form.mobile}
                      className="px-4 py-2.5 bg-[#34699A] text-white text-sm font-medium rounded-xl hover:bg-[#2a5580] transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5">
                      {otpLoading
                        ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                        : <><FaKey /> {otpSent ? "Resend OTP" : "Send OTP"}</>
                      }
                    </button>
                  </div>

                  {otpSent && demoOtp && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium mb-1">Demo Mode — OTP generated</p>
                      <p className="text-amber-600 text-xs">In production, this would be sent via SMS to <strong>{form.mobile}</strong>.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-amber-700">OTP:</span>
                        <span className="font-mono font-bold text-lg text-amber-800 tracking-widest">{demoOtp}</span>
                      </div>
                    </div>
                  )}

                  {otpSent && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                      <input value={otpInput} onChange={e => setOtpInput(e.target.value)}
                        maxLength={6} placeholder="6-digit OTP"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#34699A] transition font-mono tracking-widest text-center text-lg" />
                    </div>
                  )}
                </div>

                <button type="submit" disabled={formLoading || !otpSent}
                  className="w-full py-3 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {formLoading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                    : <><FaUserPlus /> Verify OTP & Create User</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
