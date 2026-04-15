import React, { useEffect, useState, useContext, useCallback } from "react";
import { Link } from "react-router";
import { FaPlus, FaTrash, FaBoxOpen, FaTag, FaEdit, FaTimes } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const CATEGORIES = [
  "Grains & Rice", "Oils & Fats", "Dairy & Eggs", "Beverages & Water",
  "Bread & Bakery", "Condiments", "Frozen Foods", "Snacks & Chips",
  "Cleaning Supplies", "Personal Care", "Canned Goods", "Spices & Herbs",
  "Fruits & Vegetables", "Meat & Poultry", "Other"
];

const EditProductModal = ({ product, onClose, onSave }) => {
  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#34699A] outline-none text-sm";
  const [form, setForm] = useState({
    title: product.title || "",
    category: product.category || "",
    brand: product.brand || "",
    unit: product.unit || "",
    description: product.description || "",
    image: product.image || "",
  });

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload = {};
    for (const [k, v] of Object.entries(form)) {
      if (v.trim() !== (product[k] || "").trim()) payload[k] = v;
    }
    if (Object.keys(payload).length === 0) { toast.info("No changes made"); return; }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-900">Edit Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product Title *</label>
            <input value={form.title} onChange={e => handleChange("title", e.target.value)} className={inputCls} placeholder="e.g. Basmati Rice Premium" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
              <input value={form.brand} onChange={e => handleChange("brand", e.target.value)} className={inputCls} placeholder="e.g. Al-Doha" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input value={form.unit} onChange={e => handleChange("unit", e.target.value)} className={inputCls} placeholder="e.g. 25kg bag" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => handleChange("category", e.target.value)} className={inputCls}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => handleChange("description", e.target.value)} rows={3} className={inputCls} placeholder="Describe the product..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
            <input value={form.image} onChange={e => handleChange("image", e.target.value)} className={inputCls} placeholder="https://..." />
            {form.image && <img src={form.image} alt="preview" className="mt-2 h-20 rounded-lg object-cover border border-gray-200" onError={e => e.target.style.display = "none"} />}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white rounded-xl font-semibold hover:opacity-90 transition text-sm">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

const MyProduct = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);

  const fetchProducts = useCallback(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/products/my-products", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setProducts(Array.isArray(data) ? data : []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false))
    );
  }, [user]);

  useEffect(fetchProducts, [fetchProducts]);

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

  const handleSaveEdit = async (payload) => {
    try {
      const token = await user.getIdToken();
      const r = await fetch(`/api/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      toast.success("Product updated");
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {editProduct && <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} onSave={handleSaveEdit} />}

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
            <Link to="/create-product" className="inline-block mt-6 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium">Add First Product</Link>
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
                    <Link to="/create-deal" state={{ productId: p.id }} className="flex-1 text-center py-2 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition">+ Deal</Link>
                    <button onClick={() => setEditProduct(p)} title="Edit product"
                      className="px-3 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition text-sm cursor-pointer">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Delete product"
                      className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm cursor-pointer">
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
