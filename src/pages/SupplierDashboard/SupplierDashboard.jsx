import React, { useEffect, useState, useContext, useCallback } from "react";
import { Link } from "react-router";
import {
  FaChartBar, FaDownload, FaMoneyBillWave, FaBoxOpen,
  FaTags, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaSpinner, FaCalendarAlt, FaShoppingCart,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";

const PERIODS = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "1 Year", days: 365 },
];

const STATUS_COLORS = {
  Active:     { bg: "bg-emerald-100", text: "text-emerald-700" },
  Upcoming:   { bg: "bg-purple-100",  text: "text-purple-700"  },
  Successful: { bg: "bg-blue-100",    text: "text-blue-700"    },
  Failed:     { bg: "bg-red-100",     text: "text-red-600"     },
  Stopped:    { bg: "bg-gray-100",    text: "text-gray-600"    },
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function MetricCard({ label, value, icon: Icon, colorClass, subLabel }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium text-gray-500`}>{label}</span>
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon className="text-white text-base" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
    </div>
  );
}

export default function SupplierDashboard() {
  const { user } = useContext(AuthContext);
  const [periodIdx, setPeriodIdx] = useState(1);
  const [deals, setDeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const headers = { authorization: `Bearer ${token}` };
      const [dealsRes, ordersRes] = await Promise.all([
        fetch("/api/deals/my-deals", { headers }),
        fetch("/api/orders/supplier-orders", { headers }),
      ]);
      if (!dealsRes.ok || !ordersRes.ok) throw new Error("Failed to load data");
      const dealsData = await dealsRes.json();
      const ordersData = await ordersRes.json();
      setDeals(Array.isArray(dealsData) ? dealsData : dealsData.deals ?? []);
      setOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders ?? []);
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodDays = PERIODS[periodIdx].days;
  const fromDate = daysAgo(periodDays);
  const toDate = todayStr();
  const cutoff = new Date(fromDate).getTime();

  const periodOrders = orders.filter(
    (o) => new Date(o.created_at).getTime() >= cutoff
  );
  const capturedOrders = periodOrders.filter((o) => o.payment_status === "Captured");
  const revenue = capturedOrders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
  const unitsSold = capturedOrders.reduce((sum, o) => sum + Number(o.quantity ?? 0), 0);

  const periodDeals = deals.filter(
    (d) => new Date(d.created_at ?? d.end_time).getTime() >= cutoff
  );
  const successRate =
    periodDeals.length > 0
      ? Math.round(
          (periodDeals.filter((d) => d.status === "Successful").length /
            periodDeals.length) * 100
        )
      : 0;

  const dealStatusCounts = deals.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/reports/supplier?from=${fromDate}&to=${toDate}`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to generate report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SmartDeals_Report_${fromDate}_${toDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully.");
    } catch (err) {
      toast.error(err.message ?? "Failed to download report.");
    } finally {
      setDownloading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#34699A] text-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaChartBar className="text-[#34699A]" /> Supplier Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Analytics & accounting for your deals</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  i === periodIdx
                    ? "bg-[#34699A] text-white border-[#34699A] shadow"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#34699A] hover:text-[#34699A]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Revenue"
            value={`${revenue.toFixed(3)} KWD`}
            icon={FaMoneyBillWave}
            colorClass="bg-emerald-500"
            subLabel="Captured payments"
          />
          <MetricCard
            label="Units Sold"
            value={unitsSold}
            icon={FaBoxOpen}
            colorClass="bg-[#34699A]"
            subLabel="Captured orders"
          />
          <MetricCard
            label="Deals"
            value={periodDeals.length}
            icon={FaTags}
            colorClass="bg-purple-500"
            subLabel="In selected period"
          />
          <MetricCard
            label="Success Rate"
            value={`${successRate}%`}
            icon={FaChartBar}
            colorClass="bg-orange-500"
            subLabel="Successful deals"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {["Active", "Upcoming", "Successful", "Failed"].map((status) => {
            const c = STATUS_COLORS[status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
            return (
              <div key={status} className={`rounded-xl px-4 py-3 ${c.bg} flex items-center justify-between`}>
                <span className={`text-sm font-semibold ${c.text}`}>{status}</span>
                <span className={`text-xl font-bold ${c.text}`}>{dealStatusCounts[status] ?? 0}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
              <FaCalendarAlt className="text-[#34699A]" /> Accounting Report
            </h2>
            <span className="text-xs text-gray-400">{fromDate} → {toDate}</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Download a PDF accounting report of all captured payments in the selected period.
          </p>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34699A] text-white font-semibold text-sm hover:bg-[#2a5580] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {downloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {downloading ? "Generating PDF..." : `Download PDF — ${PERIODS[periodIdx].label}`}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FaTags className="text-[#34699A]" /> Recent Deals
          </h2>
          {deals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No deals yet. <Link to="/create-deal" className="text-[#34699A] hover:underline">Create your first deal →</Link></p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b">
                    <th className="text-left pb-2 font-medium">Product</th>
                    <th className="text-center pb-2 font-medium">Status</th>
                    <th className="text-center pb-2 font-medium">Progress</th>
                    <th className="text-right pb-2 font-medium">Price / unit</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.slice(0, 8).map((deal) => {
                    const progress = deal.target_quantity > 0
                      ? Math.min(100, Math.round((deal.current_quantity / deal.target_quantity) * 100))
                      : 0;
                    const sc = STATUS_COLORS[deal.status] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    const title = deal.product?.title ?? deal.product_title ?? deal.title ?? "Deal";
                    return (
                      <tr key={deal.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 pr-4">
                          <Link to={`/deals/${deal.id}`} className="font-medium text-gray-700 hover:text-[#34699A] transition-colors">
                            {title}
                          </Link>
                          {deal.product?.brand && (
                            <p className="text-xs text-gray-400">{deal.product.brand}</p>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            {deal.status}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-[#34699A] to-emerald-400"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-10 text-left">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-xs font-semibold text-[#34699A]">
                          {parseFloat(deal.price_per_unit ?? 0).toFixed(3)} KWD
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {deals.length > 0 && (
            <div className="mt-3 text-right">
              <Link to="/my-deals" className="text-xs text-[#34699A] hover:underline font-medium">View all deals →</Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FaShoppingCart className="text-[#34699A]" /> Order Summary — {PERIODS[periodIdx].label}
          </h2>
          {periodOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No orders in this period.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Orders", value: periodOrders.length, icon: FaShoppingCart, cls: "text-gray-500" },
                {
                  label: "Authorized",
                  value: periodOrders.filter(o => o.payment_status === "Authorized").length,
                  icon: FaHourglassHalf, cls: "text-blue-500"
                },
                {
                  label: "Captured",
                  value: capturedOrders.length,
                  icon: FaCheckCircle, cls: "text-emerald-500"
                },
                {
                  label: "Cancelled",
                  value: periodOrders.filter(o => o.payment_status === "Cancelled").length,
                  icon: FaTimesCircle, cls: "text-red-400"
                },
              ].map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cls} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <span className="text-xl font-bold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          )}
          {periodOrders.length > 0 && (
            <div className="mt-4 text-right">
              <Link to="/supplier-orders" className="text-xs text-[#34699A] hover:underline font-medium">View all orders →</Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
