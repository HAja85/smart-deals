import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { FaBell, FaCheck, FaCheckDouble, FaBoxOpen, FaTag, FaExclamationTriangle, FaCog } from "react-icons/fa";
import { Link } from "react-router";
import { AuthContext } from "../../context/AuthContext";

const typeIcon = (type) => {
  if (type === "Order") return <FaBoxOpen className="text-[#34699A]" />;
  if (type === "Deal") return <FaTag className="text-emerald-600" />;
  if (type === "Expiry") return <FaExclamationTriangle className="text-amber-500" />;
  if (type === "Quantity") return <FaBoxOpen className="text-purple-500" />;
  return <FaCog className="text-gray-400" />;
};

const typeColor = (type) => {
  if (type === "Order") return "bg-blue-50 border-blue-100";
  if (type === "Deal") return "bg-emerald-50 border-emerald-100";
  if (type === "Expiry") return "bg-amber-50 border-amber-100";
  if (type === "Quantity") return "bg-purple-50 border-purple-100";
  return "bg-gray-50 border-gray-100";
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = () => {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/notifications", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id) => {
    try {
      const token = await user.getIdToken();
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl text-gray-600 hover:text-[#34699A] hover:bg-[#58A0C8]/10 transition cursor-pointer"
        aria-label="Notifications"
      >
        <FaBell className="text-xl" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-2">
              <FaBell className="text-[#34699A]" />
              <h3 className="font-bold text-gray-800">Notifications</h3>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#34699A] hover:text-[#2d5a87] font-medium transition cursor-pointer">
                <FaCheckDouble /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <FaBell className="text-4xl text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">We'll alert you about orders and deal updates</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${n.is_read ? "bg-white" : "bg-blue-50/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${typeColor(n.type)}`}>
                        {typeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-tight ${n.is_read ? "text-gray-700" : "text-gray-900"}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                            {!n.is_read && (
                              <button onClick={() => markRead(n.id)}
                                className="text-[#34699A] hover:text-[#2d5a87] p-0.5 transition cursor-pointer"
                                title="Mark as read">
                                <FaCheck className="text-xs" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        {n.deal_id && (
                          <Link
                            to={`/deals/${n.deal_id}`}
                            onClick={() => { markRead(n.id); setOpen(false); }}
                            className="text-xs text-[#34699A] hover:underline mt-1 inline-block font-medium"
                          >
                            View Deal →
                          </Link>
                        )}
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-center">
              <p className="text-xs text-gray-400">{notifications.length} notification{notifications.length !== 1 ? "s" : ""} total</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
