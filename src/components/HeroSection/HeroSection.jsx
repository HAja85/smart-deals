import React, { useState, useEffect } from "react";
import { FaSearch, FaShoppingCart, FaTags, FaFire, FaUsers, FaCheckCircle, FaBolt } from "react-icons/fa";
import { Link, useNavigate } from "react-router";

const CATEGORIES = [
  { label: "Rice & Grains", emoji: "🌾" },
  { label: "Beverages", emoji: "🥤" },
  { label: "Dairy", emoji: "🥛" },
  { label: "Oils & Fats", emoji: "🫒" },
  { label: "Snacks", emoji: "🍪" },
  { label: "Cleaning", emoji: "🧹" },
  { label: "Frozen Foods", emoji: "❄️" },
  { label: "Canned Goods", emoji: "🥫" },
];

const AnimatedStat = ({ end, suffix, label }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-extrabold text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-blue-200 text-xs mt-0.5">{label}</div>
    </div>
  );
};

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/deals?search=${encodeURIComponent(query.trim())}`);
    else navigate("/deals");
  };

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f2942 0%, #1a4a72 40%, #0e6655 100%)" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #34d399 0%, transparent 50%)" }} />

      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm">
          <FaFire className="animate-pulse" /> Kuwait's #1 Group Buying Marketplace
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white mb-5">
          Buy Together,{" "}
          <span className="relative inline-block">
            <span className="text-amber-400">Save More</span>
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-amber-400/40 rounded-full" />
          </span>
          <br className="hidden sm:block" />
          <span className="text-emerald-400"> Best Bulk Deals</span> in Kuwait
        </h1>

        <p className="text-blue-100 mt-2 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Join thousands of Kuwaiti shoppers. The more people that join a deal, the bigger the discount — for everyone.
        </p>

        <form onSubmit={handleSearch} className="mt-8 flex justify-center px-2">
          <div className="flex items-center bg-white/95 backdrop-blur shadow-2xl rounded-2xl px-4 w-full max-w-xl border border-white/20">
            <FaSearch className="text-gray-400 text-sm shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals — rice, water, milk, oil..."
              className="flex-1 py-3.5 px-3 outline-none text-gray-700 bg-transparent text-sm"
            />
            <button type="submit"
              className="bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white px-5 py-2 rounded-xl hover:opacity-90 transition text-sm font-semibold shrink-0">
              Search
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.label} onClick={() => navigate(`/deals?search=${encodeURIComponent(cat.label)}`)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full transition backdrop-blur-sm">
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/deals"
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-amber-400/30 transition">
            <FaBolt /> Browse All Deals
          </Link>
          <Link to="/signup"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl backdrop-blur-sm transition">
            <FaShoppingCart /> Join for Free
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm mx-auto border-t border-white/10 pt-8">
          <AnimatedStat end={500} suffix="+" label="Active Deals" />
          <AnimatedStat end={12000} suffix="+" label="Happy Buyers" />
          <AnimatedStat end={35} suffix="%" label="Avg. Savings" />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-blue-200">
          <span className="flex items-center gap-1.5"><FaCheckCircle className="text-emerald-400" /> Halal Certified</span>
          <span className="flex items-center gap-1.5"><FaCheckCircle className="text-emerald-400" /> KWD Pricing</span>
          <span className="flex items-center gap-1.5"><FaCheckCircle className="text-emerald-400" /> Kuwait-wide Delivery</span>
          <span className="flex items-center gap-1.5"><FaUsers className="text-emerald-400" /> Group-verified Suppliers</span>
        </div>
      </div>

      <div className="relative z-10 overflow-hidden">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-10 sm:h-14" fill="white">
          <path d="M0,60 C480,0 960,0 1440,60 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
