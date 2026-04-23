import React, { useState, useContext } from "react";
import { Link, NavLink } from "react-router";
import {
  FaHome, FaSignInAlt, FaUserPlus, FaSignOutAlt, FaBars, FaTimes,
  FaStore, FaShoppingBag, FaPlus, FaTags, FaShoppingCart, FaClipboardList, FaChartBar,
} from "react-icons/fa";
import { MdOutlineSmartToy } from "react-icons/md";
import { AuthContext } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell/NotificationBell";

const Navbar = () => {
  const { user, logoutUser, loading } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const isSupplier = user?.role === "supplier";

  const navLinks = [
    { to: "/", label: "Home", icon: <FaHome /> },
    { to: "/deals", label: "All Deals", icon: <FaTags /> },
    ...(user && isSupplier ? [
      { to: "/supplier-dashboard", label: "Dashboard", icon: <FaChartBar /> },
      { to: "/my-products", label: "My Products", icon: <FaStore /> },
      { to: "/my-deals", label: "My Deals", icon: <FaShoppingBag /> },
      { to: "/supplier-orders", label: "All Orders", icon: <FaClipboardList /> },
      { to: "/create-product", label: "Add Product", icon: <FaPlus /> },
      { to: "/create-deal", label: "New Deal", icon: <FaTags /> },
    ] : []),
    ...(user && !isSupplier ? [
      { to: "/my-orders", label: "My Orders", icon: <FaShoppingCart /> },
    ] : []),
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white shadow-sm"
        : "text-gray-700 hover:text-[#34699A] hover:bg-[#58A0C8]/10"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-md border-b border-[#58A0C8]/30">
      <nav className="max-w-[1550px] mx-auto flex items-center justify-between h-16 px-6">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] rounded-lg text-white">
            <MdOutlineSmartToy className="text-xl" />
          </div>
          <span className="font-extrabold text-xl text-gray-800 group-hover:text-[#34699A] transition">
            Smart<span className="text-[#34699A]">Deals</span>
            <span className="text-xs text-emerald-600 font-normal ml-1 hidden sm:inline">Kuwait</span>
          </span>
        </NavLink>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
              {link.icon} {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 border-3 border-[#58A0C8] border-t-transparent rounded-full animate-spin" />
          ) : !user ? (
            <>
              <NavLink to="/login" className="px-5 py-2 rounded-md font-medium text-white bg-gradient-to-r from-[#34699A] to-[#58A0C8] hover:opacity-90 transition text-sm">
                <FaSignInAlt className="inline mr-2" />Login
              </NavLink>
              <NavLink to="/signup" className="px-5 py-2 rounded-md font-medium border border-[#58A0C8] text-[#34699A] hover:bg-[#58A0C8]/10 transition text-sm">
                <FaUserPlus className="inline mr-2" />Signup
              </NavLink>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative group cursor-pointer">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=34699A&color=fff`}
                  alt="Profile"
                  className="w-9 h-9 rounded-full border-2 border-[#58A0C8] object-cover"
                />
                <div className="absolute right-0 mt-2 w-52 bg-white shadow-lg rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 z-50">
                  <p className="text-sm font-semibold text-gray-800">{user.displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${isSupplier ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                    {isSupplier ? "Supplier" : "Consumer"}
                  </span>
                </div>
              </div>
              <button onClick={logoutUser} className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white bg-gradient-to-r from-[#34699A] to-[#58A0C8] hover:opacity-90 transition text-sm cursor-pointer">
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-[#34699A] text-2xl">
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      {isOpen && (
        <div className="lg:hidden bg-white shadow-md border-t border-[#58A0C8]/30">
          <div className="flex flex-col gap-2 px-4 py-3">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass} onClick={() => setIsOpen(false)}>
                {link.icon} {link.label}
              </NavLink>
            ))}
            {user && (
              <div className="flex items-center gap-2 px-2 py-1">
                <NotificationBell />
                <span className="text-sm text-gray-600">Notifications</span>
              </div>
            )}
            {!user ? (
              <>
                <NavLink to="/login" className="flex items-center justify-center px-5 py-2 rounded-md font-medium text-white bg-gradient-to-r from-[#34699A] to-[#58A0C8]" onClick={() => setIsOpen(false)}>
                  <FaSignInAlt className="mr-2" /> Login
                </NavLink>
                <NavLink to="/signup" className="flex items-center justify-center px-5 py-2 rounded-md font-medium border border-[#58A0C8] text-[#34699A]" onClick={() => setIsOpen(false)}>
                  <FaUserPlus className="mr-2" /> Signup
                </NavLink>
              </>
            ) : (
              <button onClick={() => { logoutUser(); setIsOpen(false); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-white bg-gradient-to-r from-[#34699A] to-[#58A0C8]">
                <FaSignOutAlt /> Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
