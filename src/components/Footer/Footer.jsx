import React from "react";
import { NavLink } from "react-router";
import {
  FaEnvelope, FaPhoneAlt, FaMapMarkerAlt,
  FaBoxOpen, FaHome, FaAppleAlt, FaTags, FaSignInAlt, FaUserPlus,
} from "react-icons/fa";
import { MdOutlineSmartToy } from "react-icons/md";

const Footer = () => {
  return (
    <footer className="bg-[#07182E] text-gray-300 py-10">
      <div className="max-w-[1550px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 border-b border-gray-700 pb-8">
        <div className="md:col-span-1">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] rounded-lg text-white">
              <MdOutlineSmartToy className="text-xl" />
            </div>
            <span className="font-extrabold text-xl text-white">
              Smart<span className="text-cyan-400">Deals</span>
            </span>
          </NavLink>
          <p className="text-sm mt-3 leading-relaxed">
            Kuwait's trusted group-buying marketplace for supermarket essentials.
            Save more by buying together.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            <FaMapMarkerAlt className="inline mr-1 text-sky-400" />
            Kuwait City, Kuwait
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><NavLink to="/deals" className="flex items-center gap-2 hover:text-sky-400 transition"><FaTags className="text-sky-400" /> All Deals</NavLink></li>
            <li><NavLink to="/login" className="flex items-center gap-2 hover:text-sky-400 transition"><FaSignInAlt className="text-sky-400" /> Login</NavLink></li>
            <li><NavLink to="/signup" className="flex items-center gap-2 hover:text-sky-400 transition"><FaUserPlus className="text-sky-400" /> Sign Up</NavLink></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Categories</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 hover:text-sky-400 transition"><FaAppleAlt className="text-sky-400" /> Groceries & Food</li>
            <li className="flex items-center gap-2 hover:text-sky-400 transition"><FaBoxOpen className="text-sky-400" /> Cleaning Supplies</li>
            <li className="flex items-center gap-2 hover:text-sky-400 transition"><FaHome className="text-sky-400" /> Household Items</li>
            <li className="flex items-center gap-2 hover:text-sky-400 transition"><FaBoxOpen className="text-sky-400" /> Beverages</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Contact & Support</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><FaEnvelope className="text-sky-400" /> support@smartdeals.kw</li>
            <li className="flex items-center gap-2"><FaPhoneAlt className="text-sky-400" /> +965 2200 0000</li>
            <li className="flex items-center gap-2"><FaMapMarkerAlt className="text-sky-400" /> Salmiya, Kuwait City</li>
          </ul>
        </div>
      </div>

      <div className="text-center text-sm text-gray-400 mt-6">
        © 2025 <span className="text-white font-semibold">SmartDeals Kuwait</span>. All rights reserved.
        <p className="text-xs mt-1 text-gray-500">Prices in Kuwaiti Dinar (KWD · د.ك)</p>
      </div>
    </footer>
  );
};

export default Footer;
