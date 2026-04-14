import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router";
import { FaPlus, FaUsers, FaClock, FaTags } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { formatCountdown, useCountdown } from "../../hooks/useCountdown";

const DealRow = ({ deal }) => {
  const product = deal.product || {};
  const progress = deal.progress_percent || 0;
  const t = useCountdown(deal.end_time);

  return (
    <Link to={`/deals/${deal.id}`} className="bg-white rounded-2xl shadow hover:shadow-md transition-all border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <img src={product.image || "https://placehold.co/80x80?text=P"} alt={product.title} className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">{product.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${deal.status === "Active" ? "bg-emerald-100 text-emerald-700" : deal.status === "Successful" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>
            {deal.status}
          </span>
        </div>
        <p className="text-xs text-gray-500">{product.brand} · {product.unit}</p>
        <div className="mt-2 w-full">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1"><FaUsers className="text-[#58A0C8]" /> {deal.current_quantity}/{deal.target_quantity} units</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#34699A] to-emerald-400"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-[#34699A]">{parseFloat(deal.price_per_unit).toFixed(3)}</p>
        <p className="text-xs text-gray-400">KWD/unit</p>
        {deal.status === "Active" && (
          <p className={`text-xs font-medium mt-1 flex items-center gap-1 justify-end ${t.expired ? "text-red-500" : "text-orange-500"}`}>
            <FaClock /> {formatCountdown(t)}
          </p>
        )}
      </div>
    </Link>
  );
};

const MyDeals = () => {
  const { user } = useContext(AuthContext);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/deals/my-deals", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(setDeals)
        .catch(() => setDeals([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  const stats = {
    active: deals.filter(d => d.status === "Active").length,
    successful: deals.filter(d => d.status === "Successful").length,
    failed: deals.filter(d => d.status === "Failed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Deals</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your active and past group deals</p>
          </div>
          <Link to="/create-deal" className="flex items-center gap-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm">
            <FaPlus /> New Deal
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[["Active", stats.active, "bg-emerald-50 border-emerald-200 text-emerald-700"], ["Successful", stats.successful, "bg-blue-50 border-blue-200 text-blue-700"], ["Failed", stats.failed, "bg-red-50 border-red-200 text-red-600"]].map(([label, count, cls]) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${cls}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl shadow animate-pulse h-24" />)}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <FaTags className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No deals yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first group deal to start selling in bulk</p>
            <Link to="/create-deal" className="inline-block mt-6 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#2d5a87] transition">Create First Deal</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map(d => <DealRow key={d.id} deal={d} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDeals;
