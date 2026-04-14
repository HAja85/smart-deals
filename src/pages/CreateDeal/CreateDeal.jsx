import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { FaArrowLeft, FaTags } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Swal from "sweetalert2";

const CreateDeal = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedProductId = location.state?.productId;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(token =>
      fetch("/api/products/my-products", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          setProducts(Array.isArray(data) ? data : []);
          if (preselectedProductId) {
            const found = data.find(p => p.id === preselectedProductId);
            if (found) setSelectedProduct(found);
          }
        })
        .finally(() => setLoading(false))
    );
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productId = parseInt(e.target.productId.value);
    const targetQty = parseInt(e.target.targetQty.value);
    const pricePerUnit = parseFloat(e.target.pricePerUnit.value);
    const endTime = e.target.endTime.value;

    if (!productId) { Swal.fire({ icon: "warning", title: "Select a product first" }); return; }
    if (targetQty < 1) { Swal.fire({ icon: "warning", title: "Target quantity must be at least 1" }); return; }
    if (pricePerUnit <= 0) { Swal.fire({ icon: "warning", title: "Enter a valid price" }); return; }

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, target_quantity: targetQty, price_per_unit: pricePerUnit, end_time: new Date(endTime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create deal");
      await Swal.fire({ icon: "success", title: "Deal Created!", text: "Your group deal is now live." });
      navigate("/my-deals");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#34699A] focus:border-transparent outline-none transition text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/my-deals" className="flex items-center gap-2 text-gray-600 hover:text-[#34699A] transition mb-6 text-sm font-medium">
          <FaArrowLeft /> Back to My Deals
        </Link>

        <h1 className="text-3xl font-bold text-center text-[#34699A] mb-2">Create Group Deal</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Set a target quantity and price — consumers join until the target is met</p>

        {loading ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <FaTags className="text-5xl text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">You need at least one product to create a deal.</p>
            <Link to="/create-product" className="inline-block mt-4 bg-[#34699A] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#2d5a87] transition">Add a Product First</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div>
              <label className={labelCls}>Select Product *</label>
              <select name="productId" required className={inputCls} defaultValue={preselectedProductId || ""}
                onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)) || null)}>
                <option value="">Choose a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.title} — {p.brand} ({p.unit})</option>)}
              </select>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <img src={selectedProduct.image || "https://placehold.co/60x60?text=P"} alt={selectedProduct.title} className="w-14 h-14 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{selectedProduct.title}</p>
                  <p className="text-xs text-gray-500">{selectedProduct.brand} · {selectedProduct.unit} · {selectedProduct.category}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Target Quantity (units) *</label>
                <input type="number" name="targetQty" required min={1} placeholder="e.g. 100" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Minimum units needed for the deal to succeed</p>
              </div>
              <div>
                <label className={labelCls}>Price Per Unit (KWD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">د.ك</span>
                  <input type="number" name="pricePerUnit" required min={0.001} step={0.001} placeholder="0.000" className={`${inputCls} pl-10`} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Deal End Date & Time *</label>
              <input type="datetime-local" name="endTime" required min={minDate} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">If target quantity is not met by this time, the deal will fail</p>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2">
              <FaTags /> Create Deal
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateDeal;
