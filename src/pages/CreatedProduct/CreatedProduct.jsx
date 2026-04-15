import React, { useContext, useState } from "react";
import { Link } from "react-router";
import { FaArrowLeft } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Swal from "sweetalert2";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

const CATEGORIES = [
  "Grains & Rice", "Oils & Fats", "Beverages", "Dairy", "Eggs & Poultry",
  "Sugar & Sweeteners", "Instant Food", "Canned Goods", "Frozen Foods", "Snacks",
  "Cleaning Supplies", "Household", "Pasta & Noodles", "Breakfast", "Spreads",
  "Spices", "Dried Fruits", "Nuts & Seeds", "Baking", "Condiments",
  "Bread & Bakery", "Cooking Essentials",
];

const CreatedProduct = () => {
  const { user } = useContext(AuthContext);
  const [productImage, setProductImage] = useState("");

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productImage) {
      Swal.fire({ title: "Image Required", text: "Please upload or provide a product image.", icon: "warning" });
      return;
    }
    const formData = {
      title: e.target.title.value,
      category: e.target.category.value,
      brand: e.target.brand.value,
      unit: e.target.unit.value,
      image: productImage,
      seller_name: e.target.sellerName.value,
      seller_contact: e.target.sellerContact.value,
      location: e.target.location.value,
      description: e.target.description.value,
    };
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create product");
      Swal.fire({ title: "Product Added!", text: "You can now create a deal for this product.", icon: "success" });
      e.target.reset();
      setProductImage("");
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message, icon: "error" });
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#34699A] focus:border-transparent outline-none transition text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/my-products" className="flex items-center gap-2 text-gray-600 hover:text-[#34699A] transition mb-6 text-sm font-medium">
          <FaArrowLeft /> Back to My Products
        </Link>

        <h1 className="text-3xl font-bold text-center text-[#34699A] mb-8">Add New Product</h1>

        <form onSubmit={handleCreateProduct} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Product Title *</label>
              <input type="text" name="title" required placeholder="e.g. Basmati Rice Premium" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select name="category" required className={inputCls}>
                <option value="">Select a Category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Brand *</label>
              <input type="text" name="brand" required placeholder="e.g. Al-Doha, Hayat, Almarai" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unit *</label>
              <input type="text" name="unit" required placeholder="e.g. 25kg bag, 12 × 1L, 30 eggs" className={inputCls} />
            </div>
          </div>

          <ImageUploader
            value={productImage}
            onChange={setProductImage}
            label="Product Image *"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Seller / Company Name</label>
              <input type="text" name="sellerName" defaultValue={user?.displayName || ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Number</label>
              <input type="tel" name="sellerContact" placeholder="+965 2200 0000" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Location</label>
            <input type="text" name="location" placeholder="e.g. Salmiya, Kuwait City" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Product Description *</label>
            <textarea name="description" rows={3} required placeholder="Describe the product — quality, origin, use case..." className={`${inputCls} resize-none`} />
          </div>

          <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white font-semibold rounded-xl hover:opacity-90 transition cursor-pointer">
            Add Product
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatedProduct;
