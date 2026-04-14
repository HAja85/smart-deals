import React, { useState } from "react";
import { FaSearch, FaShoppingCart, FaTags } from "react-icons/fa";
import bghero1 from "../../assets/bg-hero-left.png";
import bghero2 from "../../assets/bg-hero-right.png";
import { Link, useNavigate } from "react-router";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/deals?search=${encodeURIComponent(query.trim())}`);
    else navigate("/deals");
  };

  return (
    <section className="relative min-h-[65vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-gradient-to-br from-sky-100 via-white to-emerald-50">
      <img src={bghero1} alt="" className="absolute left-0 top-0 h-full w-auto object-contain opacity-80 pointer-events-none" />
      <img src={bghero2} alt="" className="absolute right-0 top-0 h-full w-auto object-contain opacity-80 pointer-events-none" />

      <div className="z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
          <FaTags /> Kuwait's #1 Group Buying Marketplace
        </div>

        <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
          Save More with <span className="text-[#34699A]">Group Buying</span>
          <br />
          <span className="text-emerald-600">Best Bulk Deals</span> in Kuwait
        </h1>

        <p className="text-gray-600 mt-4 text-base md:text-lg max-w-2xl mx-auto">
          Join thousands of Kuwaiti shoppers saving big on supermarket essentials.
          The more people join a deal, the better the price — for everyone.
        </p>

        <form onSubmit={handleSearch} className="mt-8 flex justify-center">
          <div className="flex items-center bg-white shadow-lg rounded-full px-4 w-full max-w-lg border border-gray-200">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals — rice, water, milk, oil..."
              className="flex-1 py-3 px-3 outline-none text-gray-700 rounded-full text-sm"
            />
            <button type="submit" className="bg-[#34699A] text-white p-3 rounded-full hover:bg-[#2d5a87] transition">
              <FaSearch />
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link to="/deals" className="flex items-center gap-2 bg-[#34699A] text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:bg-[#2d5a87] transition">
            <FaTags /> Browse All Deals
          </Link>
          <Link to="/signup" className="flex items-center gap-2 border-2 border-emerald-600 text-emerald-700 font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 hover:text-white transition">
            <FaShoppingCart /> Join for Free
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2"><span className="text-emerald-500 font-bold text-lg">50+</span> Products</div>
          <div className="flex items-center gap-2"><span className="text-[#34699A] font-bold text-lg">د.ك</span> KWD Pricing</div>
          <div className="flex items-center gap-2"><span className="text-emerald-500 font-bold text-lg">100%</span> Halal Certified</div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
