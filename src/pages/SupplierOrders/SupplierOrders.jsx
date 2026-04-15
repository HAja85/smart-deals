import React, { useEffect, useState, useContext, useCallback } from "react";
import { Link } from "react-router";
import {
  FaClipboardList, FaSearch, FaFilter, FaCheckCircle,
  FaTimesCircle, FaHourglassHalf, FaExternalLinkAlt, FaBoxOpen,
  FaPhone, FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaTruck, FaBan,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

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
  if (s === "Authorized") return "Authorized";
  if (s === "Captured") return "Captured";
  if (s === "Pending") return "Pending";
  return s;
};

const dealStatusColor = (s) => {
  if (s === "Successful") return "bg-emerald-100 text-emerald-700";
  if (s === "Failed") return "bg-red-100 text-red-600";
  if (s === "Active") return "bg-blue-100 text-blue-700";
  if (s === "Stopped") return "bg-gray-100 text-gray-600";
  return "bg-purple-100 text-purple-700";
};

const deliveryBadge = (s) => {
  if (s === "Delivered") return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
};

const OrderRow = ({ order, onCancel, onDeliver }) => {
  const [expanded, setExpanded] = useState(false);
  const canCancel = !["Cancelled", "Captured"].includes(order.payment_status);
  const canDeliver = order.payment_status !== "Cancelled" && order.delivery_status !== "Delivered";

  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-[#34699A]">
            {order.order_number || `#${order.id}`}
          </span>
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
              <p className="font-medium text-gray-800 text-xs max-w-[130px] truncate">{order.product_title}</p>
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
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${deliveryBadge(order.delivery_status || "Pending")}`}>
            {order.delivery_status || "Pending"}
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExpanded(e => !e)}
              title="View customer info"
              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition text-xs cursor-pointer"
            >
              {expanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {canDeliver && (
              <button
                onClick={() => onDeliver(order)}
                title="Mark as Delivered"
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-xs cursor-pointer"
              >
                <FaTruck />
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel(order)}
                title="Cancel Order"
                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition text-xs cursor-pointer"
              >
                <FaBan />
              </button>
            )}
            <Link to={`/deals/${order.deal_id}`} title="View Deal"
              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition text-xs">
              <FaExternalLinkAlt />
            </Link>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50/40 border-b border-blue-100">
          <td colSpan={10} className="px-6 py-3">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-start gap-2">
                <FaPhone className="text-[#34699A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Mobile Number</p>
                  <p className="text-gray-800 font-semibold">{order.mobile_number || <span className="text-gray-400 font-normal">Not provided</span>}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-[#34699A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Delivery Address</p>
                  <p className="text-gray-800 font-semibold max-w-md">{order.delivery_address || <span className="text-gray-400 font-normal">Not provided</span>}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 ml-auto text-xs text-gray-400">
                <div>
                  <p className="font-medium text-gray-500">Order Number</p>
                  <p className="font-mono font-bold text-[#34699A]">{order.order_number || `#${order.id}`}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const SupplierOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterDeal, setFilterDeal] = useState("All");
  const [filterDelivery, setFilterDelivery] = useState("All");

  const fetchOrders = useCallback(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/orders/supplier-orders", {
        headers: { authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          setOrders(Array.isArray(data) ? data : []);
        })
        .catch(() => setOrders([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    let result = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.product_title?.toLowerCase().includes(q) ||
        o.buyer_name?.toLowerCase().includes(q) ||
        o.buyer_email?.toLowerCase().includes(q) ||
        o.order_number?.toLowerCase().includes(q) ||
        o.mobile_number?.toLowerCase().includes(q)
      );
    }
    if (filterPayment !== "All") result = result.filter(o => o.payment_status === filterPayment);
    if (filterDeal !== "All") result = result.filter(o => o.deal_status === filterDeal);
    if (filterDelivery !== "All") result = result.filter(o => (o.delivery_status || "Pending") === filterDelivery);
    setFiltered(result);
  }, [search, filterPayment, filterDeal, filterDelivery, orders]);

  const handleCancel = async (order) => {
    const res = await Swal.fire({
      title: "Cancel this order?",
      html: `
        <p class="text-gray-600 text-sm mb-2">
          Cancel order <strong>${order.order_number || `#${order.id}`}</strong> for <strong>${order.buyer_name}</strong>?
        </p>
        <p class="text-xs text-gray-500">
          ${order.payment_status === "Authorized"
            ? "The customer's card authorization will be <strong>released immediately</strong> via Stripe. No charge will be made."
            : "The order will be marked as cancelled."}
        </p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Cancel Order",
      cancelButtonText: "Keep Order",
      allowOutsideClick: false,
    });
    if (!res.isConfirmed) return;

    try {
      const token = await user.getIdToken();
      const r = await fetch(`/api/orders/${order.id}/supplier-cancel`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      toast.success("Order cancelled successfully");
      fetchOrders();
    } catch (err) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  const handleDeliver = async (order) => {
    const res = await Swal.fire({
      title: "Mark as Delivered?",
      html: `<p class="text-gray-600 text-sm">Mark order <strong>${order.order_number || `#${order.id}`}</strong> for <strong>${order.buyer_name}</strong> as delivered?<br/><span class="text-xs text-gray-400">The customer will be notified.</span></p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Mark Delivered",
      allowOutsideClick: false,
    });
    if (!res.isConfirmed) return;

    try {
      const token = await user.getIdToken();
      const r = await fetch(`/api/orders/${order.id}/mark-delivered`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      toast.success("Order marked as delivered");
      fetchOrders();
    } catch (err) {
      toast.error(err.message || "Failed to update delivery status");
    }
  };

  const totalRevenue = orders
    .filter(o => o.payment_status === "Captured")
    .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  const stats = [
    { label: "Total Orders", value: orders.length, color: "text-[#34699A]" },
    { label: "Authorized", value: orders.filter(o => o.payment_status === "Authorized").length, color: "text-blue-600" },
    { label: "Captured", value: orders.filter(o => o.payment_status === "Captured").length, color: "text-emerald-600" },
    { label: "Delivered", value: orders.filter(o => o.delivery_status === "Delivered").length, color: "text-teal-600" },
    { label: "Revenue (KWD)", value: totalRevenue.toFixed(3), color: "text-emerald-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaClipboardList className="text-[#34699A]" /> All Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">All orders placed across your deals</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
              placeholder="Search by order #, product, name, email, mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none bg-white">
              <option value="All">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Authorized">Authorized</option>
              <option value="Captured">Captured</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select value={filterDelivery} onChange={e => setFilterDelivery(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none bg-white">
              <option value="All">All Deliveries</option>
              <option value="Pending">Pending Delivery</option>
              <option value="Delivered">Delivered</option>
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
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Order #</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Buyer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Payment</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Delivery</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Deal</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onCancel={handleCancel}
                      onDeliver={handleDeliver}
                    />
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
