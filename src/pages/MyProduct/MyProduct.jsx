import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router";
import { FaPlus, FaTrash, FaBoxOpen, FaTag } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const MyProduct = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/products/my-products", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { setProducts(Array.isArray(data) ? data : []); })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false))
    );
  };

  useEffect(fetchProducts, [user]);

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Product?",
      text: "This will also remove any associated deals.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Delete",
    });
    if (!confirm.isConfirmed) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/products/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.deletedCount > 0) { toast.success("Product deleted"); fetchProducts(); }
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your product catalog for group deals</p>
          </div>
          <Link to="/create-product" className="flex items-center gap-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition text-sm">
            <FaPlus /> Add Product
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl shadow animate-pulse h-64" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <FaBoxOpen className="text-6xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first product to start creating deals</p>
            <Link to="/create-product" className="inline-block mt-6 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#2d5a87] transition">Add First Product</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-md transition-all border border-gray-100 overflow-hidden flex flex-col">
                <div className="h-44 overflow-hidden relative">
                  <img src={p.image || "https://placehold.co/400x200?text=Product"} alt={p.title} className="w-full h-full object-cover" />
                  {p.brand && <span className="absolute top-2 left-2 bg-white/90 text-xs text-gray-700 px-2 py-0.5 rounded-full font-medium">{p.brand}</span>}
                </div>
                <div className="p-4 flex flex-col flex-1 gap-1">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{p.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><FaTag className="text-[#58A0C8]" />{p.category}</span>
                    {p.unit && <><span>·</span><span className="flex items-center gap-1"><FaBoxOpen className="text-emerald-500" />{p.unit}</span></>}
                  </div>
                  {p.description && <p className="text-xs text-gray-400 line-clamp-2 mt-1">{p.description}</p>}
                  <div className="mt-auto pt-3 flex gap-2">
                    <Link to="/create-deal" state={{ productId: p.id }} className="flex-1 text-center py-2 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition">+ Create Deal</Link>
                    <button onClick={() => handleDelete(p.id)} className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm cursor-pointer">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProduct;
