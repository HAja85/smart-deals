import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router";
import {
  FaClipboardList, FaSearch, FaFilter, FaCheckCircle,
  FaTimesCircle, FaHourglassHalf, FaExternalLinkAlt, FaBoxOpen,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";

const paymentColor = (s) => {
  if (s === "Captured") return "bg-emerald-100 text-emerald-700";
  if (s === "Authorized") return "bg-blue-100 text-blue-700";
  if (s === "Cancelled") return "bg-red-100 text-red-600";
  return "bg-orange-100 text-orange-600";
};

const paymentIcon = (s) => {
  if (s === "Captured") return <FaCheckCircle className="text-emerald-500" />;
  if (s === "Authorized") return <FaCheckCircle className="text-blue-500" />;
  if (s === "Cancelled") return <FaTimesCircle className="text-red-500" />;
  return <FaHourglassHalf className="text-orange-400" />;
};

const paymentLabel = (s) => {
  if (s === "Authorized") return "Paid (Auth)";
  if (s === "Captured") return "Paid (Captured)";
  if (s === "Pending") return "Awaiting Payment";
  return s;
};

const dealStatusColor = (s) => {
  if (s === "Successful") return "bg-emerald-100 text-emerald-700";
  if (s === "Failed") return "bg-red-100 text-red-600";
  if (s === "Active") return "bg-blue-100 text-blue-700";
  if (s === "Stopped") return "bg-gray-100 text-gray-600";
  return "bg-purple-100 text-purple-700";
};

const SupplierOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterDeal, setFilterDeal] = useState("All");

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/orders/supplier-orders", {
        headers: { authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          setOrders(data);
          setFiltered(data);
        })
        .catch(() => setOrders([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  useEffect(() => {
    let result = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.product_title?.toLowerCase().includes(q) ||
        o.buyer_name?.toLowerCase().includes(q) ||
        o.buyer_email?.toLowerCase().includes(q)
      );
    }
    if (filterPayment !== "All") result = result.filter(o => o.payment_status === filterPayment);
    if (filterDeal !== "All") result = result.filter(o => o.deal_status === filterDeal);
    setFiltered(result);
  }, [search, filterPayment, filterDeal, orders]);

  const totalRevenue = orders
    .filter(o => o.payment_status === "Captured")
    .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  const stats = [
    { label: "Total Orders", value: orders.length, color: "text-[#34699A]" },
    { label: "Authorized", value: orders.filter(o => o.payment_status === "Authorized").length, color: "text-blue-600" },
    { label: "Captured", value: orders.filter(o => o.payment_status === "Captured").length, color: "text-emerald-600" },
    { label: "Revenue (KWD)", value: totalRevenue.toFixed(3), color: "text-emerald-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaClipboardList className="text-[#34699A]" /> All Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">All orders placed across your deals</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3 py-2">
            <FaSearch className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by product, buyer name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none bg-white">
              <option value="All">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Authorized">Authorized</option>
              <option value="Captured">Captured</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select value={filterDeal} onChange={e => setFilterDeal(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none bg-white">
              <option value="All">All Deal Statuses</option>
              <option value="Active">Active</option>
              <option value="Successful">Successful</option>
              <option value="Failed">Failed</option>
              <option value="Stopped">Stopped</option>
            </select>
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} orders</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-4 items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <FaBoxOpen className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">Orders placed on your deals will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Buyer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Payment</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Deal</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-400">#{order.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={order.buyer_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.buyer_name || "U")}&background=34699A&color=fff&size=32`}
                            alt={order.buyer_name}
                            className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0"
                          />
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{order.buyer_name}</p>
                            <p className="text-gray-400 text-xs">{order.buyer_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={order.product_image || "https://placehold.co/32x32?text=P"}
                            alt={order.product_title}
                            className="w-8 h-8 rounded-lg object-cover shrink-0"
                          />
                          <div>
                            <p className="font-medium text-gray-800 text-xs max-w-[140px] truncate">{order.product_title}</p>
                            <p className="text-gray-400 text-xs">{order.product_brand} · {order.product_unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800">{order.quantity}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#34699A]">
                        {parseFloat(order.total_amount || 0).toFixed(3)}
                        <span className="text-gray-400 font-normal text-xs ml-1">KWD</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${paymentColor(order.payment_status)}`}>
                          {paymentIcon(order.payment_status)} {paymentLabel(order.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${dealStatusColor(order.deal_status)}`}>
                          {order.deal_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString("en-KW", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/deals/${order.deal_id}`}
                          className="text-[#34699A] hover:text-[#2d5a87] transition p-1"
                          title="View Deal">
                          <FaExternalLinkAlt className="text-xs" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierOrders;
