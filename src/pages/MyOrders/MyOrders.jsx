import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router";
import { FaShoppingCart, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { formatCountdown, useCountdown } from "../../hooks/useCountdown";

const statusIcon = (s) => {
  if (s === "Captured") return <FaCheckCircle className="text-emerald-500" />;
  if (s === "Cancelled") return <FaTimesCircle className="text-red-500" />;
  if (s === "Authorized") return <FaCheckCircle className="text-blue-500" />;
  return <FaHourglassHalf className="text-orange-400" />;
};

const statusColor = (s) => {
  if (s === "Captured") return "bg-emerald-100 text-emerald-700";
  if (s === "Cancelled") return "bg-red-100 text-red-600";
  if (s === "Authorized") return "bg-blue-100 text-blue-700";
  return "bg-orange-100 text-orange-600";
};

const statusLabel = (s) => {
  if (s === "Authorized") return "Paid (Authorized)";
  if (s === "Captured") return "Paid (Captured)";
  if (s === "Pending") return "Awaiting Payment";
  return s;
};

const dealStatusColor = (s) => {
  if (s === "Successful") return "bg-blue-100 text-blue-700";
  if (s === "Failed") return "bg-red-100 text-red-600";
  return "bg-emerald-100 text-emerald-700";
};

const OrderCard = ({ order }) => {
  const countdown = useCountdown(order.end_time);
  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-md transition-all border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-4 p-5">
        <img
          src={order.product_image || "https://placehold.co/80x80?text=P"}
          alt={order.product_title}
          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{order.product_title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{order.product_brand} · {order.product_unit}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dealStatusColor(order.deal_status)}`}>
              Deal: {order.deal_status}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusColor(order.payment_status)}`}>
              {statusIcon(order.payment_status)} {statusLabel(order.payment_status)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-[#34699A]">{parseFloat(order.total_amount).toFixed(3)}</p>
          <p className="text-xs text-gray-500">KWD</p>
          <p className="text-sm text-gray-600 mt-1">Qty: <span className="font-semibold">{order.quantity}</span></p>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{parseFloat(order.price_per_unit).toFixed(3)} KWD/unit</span>
          <span>·</span>
          <span>Target: {order.target_quantity} units</span>
          <span>·</span>
          <span>Filled: {order.current_quantity} units</span>
        </div>
        {order.deal_status === "Active" && (
          <div className={`text-xs font-semibold flex items-center gap-1 ${countdown.expired ? "text-red-500" : "text-orange-500"}`}>
            <FaClock /> {formatCountdown(countdown)}
          </div>
        )}
        <Link to={`/deals/${order.deal_id}`} className="text-xs text-[#34699A] hover:underline font-medium">View Deal →</Link>
      </div>

      <div className="px-5 pb-3 text-right">
        <span className="text-xs text-gray-400">Ordered {new Date(order.created_at).toLocaleDateString("en-KW", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
};

const MyOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/orders/my-orders", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  const totalSpent = orders.filter(o => o.payment_status === "Captured").reduce((s, o) => s + parseFloat(o.total_amount), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Track your group deal orders and payment status</p>
          </div>
          <div className="bg-white rounded-xl shadow px-4 py-3 text-right">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold text-[#34699A]">{totalSpent.toFixed(3)} <span className="text-sm font-normal">KWD</span></p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow animate-pulse p-5 flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-3 bg-gray-200 rounded w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <FaShoppingCart className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-gray-400 text-sm mt-1">Browse active deals and join your first group buy!</p>
            <Link to="/deals" className="inline-block mt-6 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#2d5a87] transition">Browse Deals</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
