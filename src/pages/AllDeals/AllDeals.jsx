import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FaClock, FaUsers, FaSearch, FaTags, FaFilter, FaCalendarAlt } from "react-icons/fa";
import { useCountdown, formatCountdown } from "../../hooks/useCountdown";

const CountdownDisplay = ({ endTime, status }) => {
  const t = useCountdown(endTime);
  if (status !== "Active") return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${t.expired ? "text-red-500" : "text-orange-500"}`}>
      <FaClock /> {formatCountdown(t)}
    </div>
  );
};

const StartDisplay = ({ startTime, status }) => {
  const t = useCountdown(startTime);
  if (status !== "Upcoming" || t.expired) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600">
      <FaCalendarAlt /> Starts in {formatCountdown(t)}
    </div>
  );
};

const DealCard = ({ deal }) => {
  const product = deal.product || {};
  const progress = deal.progress_percent || 0;
  const discountPct = deal.discount_percent || 0;

  return (
    <Link to={`/deals/${deal.id}`} className="group bg-white rounded-2xl shadow hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col">
      <div className="relative overflow-hidden h-48">
        <img src={product.image || "https://placehold.co/400x200?text=Product"} alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full shadow ${
          deal.status === "Active" ? "bg-emerald-100 text-emerald-700" :
          deal.status === "Upcoming" ? "bg-purple-100 text-purple-700" :
          deal.status === "Successful" ? "bg-blue-100 text-blue-700" :
          deal.status === "Stopped" ? "bg-gray-100 text-gray-600" :
          "bg-red-100 text-red-600"
        }`}>
          {deal.status}
        </span>
        {discountPct > 0 && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
        {product.brand && (
          <span className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{product.brand}</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.title}</h3>
        <p className="text-xs text-gray-500">{product.unit} · {product.category}</p>

        <div className="flex items-center justify-between">
          <div>
            {deal.actual_price && (
              <p className="text-xs text-gray-400 line-through">{parseFloat(deal.actual_price).toFixed(3)} KWD</p>
            )}
            <span className="text-xl font-bold text-[#34699A]">{parseFloat(deal.price_per_unit).toFixed(3)}<span className="text-sm font-normal text-gray-500 ml-1">KWD</span></span>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <FaUsers className="text-[#58A0C8]" />{deal.current_quantity}/{deal.target_quantity}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{deal.current_quantity} joined</span><span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#34699A] to-emerald-400"}`}
              style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>

        <CountdownDisplay endTime={deal.end_time} status={deal.status} />
        <StartDisplay startTime={deal.start_time} status={deal.status} />

        <button className={`mt-auto w-full py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition ${
          deal.status === "Upcoming" ? "bg-gradient-to-r from-purple-500 to-purple-600" : "bg-gradient-to-r from-[#34699A] to-[#58A0C8]"
        }`}>
          {deal.status === "Upcoming" ? "See Details" : deal.status === "Active" ? "Join Deal" : "View Details"}
        </button>
      </div>
    </Link>
  );
};

const AllDeals = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Active");
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [searchInput, setSearchInput] = useState(query);

  const fetchDeals = (q, f) => {
    setLoading(true);
    const url = q
      ? `/api/search?q=${encodeURIComponent(q)}`
      : f === "All" ? "/api/deals" : `/api/deals?status=${f}`;
    fetch(url).then(r => r.json()).then(setDeals).catch(() => setDeals([])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(query, filter); }, [query, filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setFilter("All");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#34699A] to-[#58A0C8] py-12 px-6 text-white text-center">
        <h1 className="text-4xl font-bold mb-2">All Group Deals</h1>
        <p className="text-blue-100 text-sm">Browse active deals and upcoming launches across Kuwait supermarket categories</p>
        <form onSubmit={handleSearch} className="mt-6 flex max-w-xl mx-auto">
          <div className="flex items-center bg-white rounded-l-xl px-4 flex-1">
            <FaSearch className="text-gray-400 mr-2" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products, brands, categories..."
              className="py-3 outline-none text-gray-700 w-full text-sm" />
          </div>
          <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-r-xl font-semibold transition">Search</button>
        </form>
      </div>

      <div className="max-w-[1300px] mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <FaFilter className="text-gray-400" />
          {["Active", "Upcoming", "Successful", "Failed", "All"].map(s => (
            <button key={s} onClick={() => { setFilter(s); setQuery(""); setSearchInput(""); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === s && !query
                  ? s === "Upcoming" ? "bg-purple-600 text-white" : "bg-[#34699A] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#34699A]"
              }`}>
              {s}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400">{deals.length} deals found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow animate-pulse overflow-hidden">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /><div className="h-8 bg-gray-200 rounded" /></div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <FaTags className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No deals found.</p>
            {query && <button onClick={() => { setQuery(""); setSearchInput(""); setFilter("Active"); }} className="mt-4 text-[#34699A] underline text-sm">Clear search</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {deals.map(d => <DealCard key={d.id} deal={d} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDeals;
