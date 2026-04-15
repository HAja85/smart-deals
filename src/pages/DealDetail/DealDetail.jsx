import React, { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { FaClock, FaUsers, FaArrowLeft, FaShoppingCart, FaTag, FaBoxOpen, FaPercent, FaCalendarAlt } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { useCountdown } from "../../hooks/useCountdown";

const CountdownBlock = ({ endTime }) => {
  const t = useCountdown(endTime);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div className="flex gap-3 justify-center">
      {[["days", "Days"], ["hours", "Hrs"], ["minutes", "Min"], ["seconds", "Sec"]].map(([key, label]) => (
        <div key={key} className={`flex flex-col items-center bg-gradient-to-b from-[#34699A] to-[#2d5a87] text-white rounded-xl px-4 py-2 min-w-[64px] shadow ${t.expired ? "opacity-50" : ""}`}>
          <span className="text-2xl font-bold font-mono">{pad(t[key] || 0)}</span>
          <span className="text-xs mt-0.5 text-blue-200">{label}</span>
        </div>
      ))}
    </div>
  );
};

const StartCountdown = ({ startTime }) => {
  const t = useCountdown(startTime);
  const pad = (n) => String(n).padStart(2, "0");
  if (t.expired) return null;
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
      <h3 className="font-semibold text-purple-700 mb-3 text-center flex items-center justify-center gap-2">
        <FaCalendarAlt /> Deal Starts In
      </h3>
      <div className="flex gap-3 justify-center">
        {[["days", "Days"], ["hours", "Hrs"], ["minutes", "Min"], ["seconds", "Sec"]].map(([key, label]) => (
          <div key={key} className="flex flex-col items-center bg-purple-600 text-white rounded-xl px-4 py-2 min-w-[64px]">
            <span className="text-2xl font-bold font-mono">{pad(t[key] || 0)}</span>
            <span className="text-xs mt-0.5 text-purple-200">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-purple-600 text-xs mt-3">
        Starts {new Date(startTime).toLocaleString("en-KW", { dateStyle: "medium", timeStyle: "short" })}
      </p>
    </div>
  );
};

const DealDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/deals/${id}`)
      .then(r => r.json())
      .then(setDeal)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    if (!user) { toast.info("Please login to join a deal"); navigate("/login"); return; }
    if (user.role === "supplier") { toast.error("Suppliers cannot place orders. Switch to a consumer account."); return; }
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }
    setJoining(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ deal_id: parseInt(id), quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to join deal");
      toast.success(`Joined! Total: ${parseFloat(data.total_amount).toFixed(3)} KWD`);
      const updated = await fetch(`/api/deals/${id}`).then(r => r.json());
      setDeal(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#58A0C8] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!deal) return <div className="text-center py-20 text-gray-500">Deal not found.</div>;

  const product = deal.product || {};
  const progress = deal.progress_percent || 0;
  const isActive = deal.status === "Active";
  const isUpcoming = deal.status === "Upcoming";
  const total = (parseFloat(deal.price_per_unit) * qty).toFixed(3);
  const discountPct = deal.discount_percent || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/deals" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#34699A] mb-6 transition text-sm font-medium">
          <FaArrowLeft /> Back to Deals
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="rounded-2xl overflow-hidden shadow-lg relative">
              <img src={product.image || "https://placehold.co/600x400?text=Product"} alt={product.title} className="w-full h-72 object-cover" />
              {discountPct > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white font-bold text-sm px-3 py-1.5 rounded-full shadow-lg">
                  Save {discountPct}%
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-white rounded-xl shadow-sm grid grid-cols-2 gap-4">
              {product.brand && (
                <div className="flex items-center gap-2">
                  <FaTag className="text-[#34699A]" />
                  <div><p className="text-xs text-gray-500">Brand</p><p className="font-semibold text-gray-800 text-sm">{product.brand}</p></div>
                </div>
              )}
              {product.unit && (
                <div className="flex items-center gap-2">
                  <FaBoxOpen className="text-emerald-600" />
                  <div><p className="text-xs text-gray-500">Unit</p><p className="font-semibold text-gray-800 text-sm">{product.unit}</p></div>
                </div>
              )}
            </div>

            {product.description && (
              <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.title}</h1>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ml-3 ${
                  isActive ? "bg-emerald-100 text-emerald-700" :
                  isUpcoming ? "bg-purple-100 text-purple-700" :
                  deal.status === "Successful" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"
                }`}>
                  {deal.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{product.category}</p>

              <div className="flex items-end gap-4 flex-wrap">
                {deal.actual_price && (
                  <div>
                    <p className="text-xs text-gray-400">Market Price</p>
                    <p className="text-lg text-gray-400 line-through">{parseFloat(deal.actual_price).toFixed(3)} KWD</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">{deal.actual_price ? "Deal Price" : "Price per unit"}</p>
                  <p className="text-3xl font-bold text-[#34699A]">
                    {parseFloat(deal.price_per_unit).toFixed(3)} <span className="text-base font-normal text-gray-500">KWD</span>
                  </p>
                </div>
                {discountPct > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full">
                    <FaPercent className="text-xs" /><span className="font-bold text-sm">Save {discountPct}%</span>
                  </div>
                )}
              </div>
            </div>

            {isUpcoming && deal.start_time && <StartCountdown startTime={deal.start_time} />}

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FaUsers className="text-[#34699A]" /> Deal Progress</h3>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{deal.current_quantity} units ordered</span>
                <span>Target: {deal.target_quantity}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                <div className={`h-3 rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#34699A] to-emerald-400"}`}
                  style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <p className="text-right text-xs text-gray-400">{progress}% complete</p>
            </div>

            {isActive && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FaClock className="text-orange-500" /> Time Remaining</h3>
                <CountdownBlock endTime={deal.end_time} />
              </div>
            )}

            {isActive && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><FaShoppingCart className="text-[#34699A]" /> Join This Deal</h3>
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm text-gray-600 font-medium">Quantity:</label>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition">−</button>
                    <input type="number" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="w-16 text-center py-2 outline-none text-gray-800 font-semibold" />
                    <button onClick={() => setQty(q => q + 1)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4">
                  <span className="text-gray-600 text-sm">Total:</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-[#34699A]">{total} KWD</span>
                    {discountPct > 0 && deal.actual_price && (
                      <p className="text-xs text-emerald-600">You save {((parseFloat(deal.actual_price) - parseFloat(deal.price_per_unit)) * qty).toFixed(3)} KWD</p>
                    )}
                  </div>
                </div>
                <button onClick={handleJoin} disabled={joining}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                  {joining ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaShoppingCart />}
                  {joining ? "Joining..." : "Join Deal"}
                </button>
                {!user && <p className="text-center text-xs text-gray-400 mt-2">Login as a consumer to join</p>}
              </div>
            )}

            {isUpcoming && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
                <p className="font-semibold text-purple-700">This deal hasn't started yet</p>
                <p className="text-sm text-purple-500 mt-1">Come back when it goes live to join!</p>
              </div>
            )}

            {!isActive && !isUpcoming && (
              <div className={`rounded-2xl p-5 text-center ${deal.status === "Successful" ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"}`}>
                <p className="font-semibold text-lg">{deal.status === "Successful" ? "🎉 Deal Succeeded!" : deal.status === "Stopped" ? "🛑 Deal Stopped" : "❌ Deal Expired"}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {deal.status === "Successful" ? "All orders captured." : deal.status === "Stopped" ? "The supplier stopped this deal." : "Target not reached in time."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetail;
