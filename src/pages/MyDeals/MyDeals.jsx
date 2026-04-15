import React, { useEffect, useState, useContext, useCallback } from "react";
import { Link } from "react-router";
import {
  FaPlus, FaUsers, FaClock, FaTags, FaEdit, FaStop, FaEye,
  FaTimes, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaBoxOpen
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { formatCountdown, useCountdown } from "../../hooks/useCountdown";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const statusColors = {
  Active: "bg-emerald-100 text-emerald-700",
  Upcoming: "bg-purple-100 text-purple-700",
  Successful: "bg-blue-100 text-blue-700",
  Failed: "bg-red-100 text-red-600",
  Stopped: "bg-gray-100 text-gray-600",
};

const payStatusIcon = (s) => {
  if (s === "Captured") return <FaCheckCircle className="text-emerald-500" />;
  if (s === "Cancelled") return <FaTimesCircle className="text-red-500" />;
  return <FaHourglassHalf className="text-orange-400" />;
};

const CountdownCell = ({ endTime, status }) => {
  const t = useCountdown(endTime);
  if (status !== "Active") return null;
  return (
    <span className={`text-xs font-semibold flex items-center gap-1 ${t.expired ? "text-red-500" : "text-orange-500"}`}>
      <FaClock /> {formatCountdown(t)}
    </span>
  );
};

const EditModal = ({ deal, onClose, onSave }) => {
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#34699A] outline-none text-sm";
  const [form, setForm] = useState({
    actual_price: deal.actual_price || "",
    price_per_unit: deal.price_per_unit || "",
    target_quantity: deal.target_quantity || "",
    start_time: deal.start_time ? deal.start_time.slice(0, 16) : "",
    end_time: deal.end_time ? deal.end_time.slice(0, 16) : "",
  });

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const payload = {};
    if (form.actual_price) payload.actual_price = parseFloat(form.actual_price);
    if (form.price_per_unit) payload.price_per_unit = parseFloat(form.price_per_unit);
    if (form.target_quantity) payload.target_quantity = parseInt(form.target_quantity);
    if (form.end_time) payload.end_time = new Date(form.end_time).toISOString();
    if (form.start_time && deal.status === "Upcoming") payload.start_time = new Date(form.start_time).toISOString();
    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-900">Edit Deal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Actual Price (KWD)</label>
              <input type="number" step={0.001} value={form.actual_price} onChange={e => handleChange("actual_price", e.target.value)} className={inputCls} placeholder="Market price" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Deal Price (KWD)</label>
              <input type="number" step={0.001} value={form.price_per_unit} onChange={e => handleChange("price_per_unit", e.target.value)} className={inputCls} placeholder="Deal price" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target Quantity</label>
            <input type="number" value={form.target_quantity} onChange={e => handleChange("target_quantity", e.target.value)} className={inputCls} />
          </div>
          {deal.status === "Upcoming" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date & Time</label>
              <input type="datetime-local" value={form.start_time} onChange={e => handleChange("start_time", e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date & Time</label>
            <input type="datetime-local" value={form.end_time} onChange={e => handleChange("end_time", e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white rounded-xl font-semibold hover:opacity-90 transition text-sm">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const CustomersModal = ({ deal, token, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/deals/${deal.id}/orders`, { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [deal.id, token]);

  const totalUnits = orders.reduce((s, o) => s + o.quantity, 0);
  const totalRevenue = orders.filter(o => o.payment_status === "Captured").reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Customers — {deal.product?.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{orders.length} orders · {totalUnits} total units · {totalRevenue.toFixed(3)} KWD revenue</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><FaTimes /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaBoxOpen className="text-5xl mx-auto mb-3 opacity-30" />
              <p>No orders placed for this deal yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-gray-500 font-medium">#</th>
                  <th className="pb-3 text-gray-500 font-medium">Customer</th>
                  <th className="pb-3 text-gray-500 font-medium text-center">Qty</th>
                  <th className="pb-3 text-gray-500 font-medium text-right">Amount</th>
                  <th className="pb-3 text-gray-500 font-medium text-center">Status</th>
                  <th className="pb-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o, i) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <img src={o.buyer_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.buyer_name)}&background=34699A&color=fff`}
                          className="w-7 h-7 rounded-full object-cover" alt={o.buyer_name} />
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{o.buyer_name}</p>
                          <p className="text-gray-400 text-xs">{o.buyer_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center font-semibold text-gray-800">{o.quantity}</td>
                    <td className="py-3 text-right font-semibold text-[#34699A]">{parseFloat(o.total_amount).toFixed(3)}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        o.payment_status === "Captured" ? "bg-emerald-100 text-emerald-700" :
                        o.payment_status === "Cancelled" ? "bg-red-100 text-red-600" :
                        "bg-orange-100 text-orange-600"}`}>
                        {payStatusIcon(o.payment_status)} {o.payment_status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString("en-KW", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const DealRow = ({ deal, onEdit, onStop, onViewCustomers }) => {
  const product = deal.product || {};
  const progress = deal.progress_percent || 0;

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition-all border border-gray-100 p-5">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Link to={`/deals/${deal.id}`} className="shrink-0">
          <img src={product.image || "https://placehold.co/80x80?text=P"} alt={product.title}
            className="w-16 h-16 rounded-xl object-cover border border-gray-100 hover:opacity-90 transition" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link to={`/deals/${deal.id}`} className="font-semibold text-gray-900 text-sm hover:text-[#34699A] transition">{product.title}</Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[deal.status] || "bg-gray-100 text-gray-600"}`}>
              {deal.status}
            </span>
            {deal.discount_percent > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                -{deal.discount_percent}% off
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{product.brand} · {product.unit}</p>

          <div className="mt-2 w-full">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span className="flex items-center gap-1"><FaUsers className="text-[#58A0C8]" /> {deal.current_quantity}/{deal.target_quantity} units</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#34699A] to-emerald-400"}`}
                style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            {deal.actual_price && <span>Market: {parseFloat(deal.actual_price).toFixed(3)} KWD</span>}
            <span className="text-[#34699A] font-semibold">Deal: {parseFloat(deal.price_per_unit).toFixed(3)} KWD/unit</span>
            {deal.status === "Upcoming" && deal.start_time && (
              <span className="text-purple-600 font-medium">
                Starts {new Date(deal.start_time).toLocaleString("en-KW", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
            <CountdownCell endTime={deal.end_time} status={deal.status} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onViewCustomers(deal)}
            title="View Customers"
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-sm cursor-pointer">
            <FaEye />
          </button>
          {["Active", "Upcoming"].includes(deal.status) && (
            <>
              <button onClick={() => onEdit(deal)}
                title="Edit Deal"
                className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition text-sm cursor-pointer">
                <FaEdit />
              </button>
              <button onClick={() => onStop(deal.id)}
                title="Stop Deal"
                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition text-sm cursor-pointer">
                <FaStop />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MyDeals = () => {
  const { user } = useContext(AuthContext);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDeal, setEditDeal] = useState(null);
  const [customersDeal, setCustomersDeal] = useState(null);
  const [token, setToken] = useState(null);

  const fetchDeals = useCallback(() => {
    if (!user) return;
    user.getIdToken().then(t => {
      setToken(t);
      fetch("/api/deals/my-deals", { headers: { authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => setDeals(Array.isArray(data) ? data : []))
        .catch(() => setDeals([]))
        .finally(() => setLoading(false));
    });
  }, [user]);

  useEffect(fetchDeals, [fetchDeals]);

  const handleStop = async (dealId) => {
    const res = await Swal.fire({
      title: "Stop this deal?",
      text: "All pending orders will be cancelled. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Stop Deal",
    });
    if (!res.isConfirmed) return;
    try {
      const t = await user.getIdToken();
      const r = await fetch(`/api/deals/${dealId}/stop`, { method: "POST", headers: { authorization: `Bearer ${t}` } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      toast.success("Deal stopped");
      fetchDeals();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async (payload) => {
    try {
      const t = await user.getIdToken();
      const r = await fetch(`/api/deals/${editDeal.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      toast.success("Deal updated");
      setEditDeal(null);
      fetchDeals();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const stats = {
    upcoming: deals.filter(d => d.status === "Upcoming").length,
    active: deals.filter(d => d.status === "Active").length,
    successful: deals.filter(d => d.status === "Successful").length,
    failed: deals.filter(d => d.status === "Failed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {editDeal && <EditModal deal={editDeal} onClose={() => setEditDeal(null)} onSave={handleSaveEdit} />}
      {customersDeal && <CustomersModal deal={customersDeal} token={token} onClose={() => setCustomersDeal(null)} />}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
            <p className="text-gray-500 text-sm mt-1">Manage, edit and track all your group deals</p>
          </div>
          <Link to="/create-deal" className="flex items-center gap-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm">
            <FaPlus /> New Deal
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            ["Upcoming", stats.upcoming, "bg-purple-50 border-purple-200 text-purple-700"],
            ["Active", stats.active, "bg-emerald-50 border-emerald-200 text-emerald-700"],
            ["Successful", stats.successful, "bg-blue-50 border-blue-200 text-blue-700"],
            ["Failed", stats.failed, "bg-red-50 border-red-200 text-red-600"],
          ].map(([label, count, cls]) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${cls}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl shadow animate-pulse h-28" />)}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <FaTags className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No deals yet</p>
            <Link to="/create-deal" className="inline-block mt-6 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium">Create First Deal</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map(d => (
              <DealRow key={d.id} deal={d}
                onEdit={setEditDeal}
                onStop={handleStop}
                onViewCustomers={setCustomersDeal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDeals;
