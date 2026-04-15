import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import HeroSection from "../../components/HeroSection/HeroSection";
import Testimonial from "../../components/Testimonial/Testimonial";
import FAQ from "../../components/FAQ/FAQ";
import { useCountdown, formatCountdown } from "../../hooks/useCountdown";
import { FaClock, FaTags, FaUsers, FaCalendarAlt } from "react-icons/fa";

const DealCard = ({ deal, isUpcoming = false }) => {
  const countdown = useCountdown(isUpcoming ? deal.start_time : deal.end_time);
  const progress = deal.progress_percent || 0;
  const product = deal.product || {};
  const discountPct = deal.discount_percent || 0;

  return (
    <Link to={`/deals/${deal.id}`}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col">
      <div className="relative overflow-hidden h-44">
        <img src={product.image || "https://placehold.co/400x200?text=Product"} alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isUpcoming ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
        }`}>
          {isUpcoming ? "Coming Soon" : "Active"}
        </span>
        {discountPct > 0 && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discountPct}%</span>
        )}
        {product.brand && (
          <span className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{product.brand}</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{product.title}</h3>
        <p className="text-xs text-gray-500">{product.unit} · {product.category}</p>

        <div className="flex items-center justify-between mt-1">
          <div>
            {deal.actual_price && (
              <p className="text-xs text-gray-400 line-through">{parseFloat(deal.actual_price).toFixed(3)} KWD</p>
            )}
            <span className="text-lg font-bold text-[#34699A]">{parseFloat(deal.price_per_unit).toFixed(3)} <span className="text-sm font-normal text-gray-500">KWD</span></span>
          </div>
          {!isUpcoming && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <FaUsers className="text-[#58A0C8]" /> {deal.current_quantity}/{deal.target_quantity}
            </span>
          )}
        </div>

        {!isUpcoming && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{progress}%</span></div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-[#34699A] to-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1 ${countdown.expired ? "text-red-500" : isUpcoming ? "text-purple-600" : "text-orange-500"}`}>
          {isUpcoming ? <FaCalendarAlt /> : <FaClock />}
          {isUpcoming ? `Starts in ${formatCountdown(countdown)}` : formatCountdown(countdown)}
        </div>

        <button className={`mt-auto w-full py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition ${
          isUpcoming ? "bg-gradient-to-r from-purple-500 to-purple-600" : "bg-gradient-to-r from-[#34699A] to-[#58A0C8]"
        }`}>
          {isUpcoming ? "Preview Deal" : "Join Deal"}
        </button>
      </div>
    </Link>
  );
};

const Home = () => {
  const [latestDeals, setLatestDeals] = useState([]);
  const [upcomingDeals, setUpcomingDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  useEffect(() => {
    fetch("/api/latest-deals")
      .then(r => r.json())
      .then(setLatestDeals)
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/upcoming-deals")
      .then(r => r.json())
      .then(setUpcomingDeals)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, []);

  return (
    <>
      <HeroSection />

      <section className="py-16 bg-white">
        <div className="max-w-[1300px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Latest <span className="text-[#34699A]">Group Deals</span></h2>
              <p className="text-gray-500 text-sm mt-1">Join before the countdown ends — save big on Kuwait's best bulk buys</p>
            </div>
            <Link to="/deals" className="hidden sm:flex items-center gap-2 text-[#34699A] font-semibold text-sm border border-[#34699A] px-4 py-2 rounded-lg hover:bg-[#34699A]/5 transition">
              <FaTags /> All Deals
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /><div className="h-6 bg-gray-200 rounded" /></div>
                </div>
              ))}
            </div>
          ) : latestDeals.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FaTags className="text-5xl mx-auto mb-4 opacity-30" />
              <p>No active deals right now. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/deals" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white font-semibold px-8 py-3 rounded-xl shadow-md hover:opacity-90 transition">
              <FaTags /> See All Active Deals
            </Link>
          </div>
        </div>
      </section>

      {(upcomingDeals.length > 0 || upcomingLoading) && (
        <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="max-w-[1300px] mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  <FaCalendarAlt /> Coming Soon
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Upcoming <span className="text-purple-600">Deals</span></h2>
                <p className="text-gray-500 text-sm mt-1">Set your reminders — these deals go live soon</p>
              </div>
              <Link to="/deals?status=Upcoming" className="hidden sm:flex items-center gap-2 text-purple-600 font-semibold text-sm border border-purple-300 px-4 py-2 rounded-lg hover:bg-purple-50 transition">
                <FaCalendarAlt /> View All Upcoming
              </Link>
            </div>

            {upcomingLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                    <div className="h-44 bg-purple-100" />
                    <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingDeals.map(deal => <DealCard key={deal.id} deal={deal} isUpcoming />)}
              </div>
            )}
          </div>
        </section>
      )}

      <Testimonial />
      <FAQ />
    </>
  );
};

export default Home;
