import React, { useState, useContext } from "react";
import {
  FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserPlus, FaImage,
  FaStore, FaShoppingCart,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";

const SignUp = () => {
  const { createUser, emailInput, setEmailInput } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("consumer");
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    const displayName = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const photoURL = e.target.photo.value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Password must include uppercase, lowercase, and a number (min 6 characters)");
      return;
    }

    createUser(email, password, displayName, photoURL, role)
      .then(() => {
        toast.success("Sign Up successful!");
        e.target.reset();
        navigate("/");
      })
      .catch((error) => {
        toast.error(error.message || "Registration failed. Please try again.");
      });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-sky-100 via-white to-[#E0F8F5]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-[#58A0C8]">
        <h2 className="text-3xl font-bold text-center text-[#34699A] mb-6">Create Account</h2>

        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("consumer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium border-2 transition ${
              role === "consumer"
                ? "bg-[#34699A] text-white border-[#34699A]"
                : "border-gray-300 text-gray-600 hover:border-[#58A0C8]"
            }`}
          >
            <FaShoppingCart /> Consumer
          </button>
          <button
            type="button"
            onClick={() => setRole("supplier")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium border-2 transition ${
              role === "supplier"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-gray-300 text-gray-600 hover:border-emerald-400"
            }`}
          >
            <FaStore /> Supplier
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block mb-1 text-gray-600 font-medium text-sm">Full Name</label>
            <div className="flex items-center border rounded-lg p-3">
              <FaUser className="text-[#58A0C8] mr-3" />
              <input type="text" name="name" required placeholder="Enter your full name" className="w-full outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-gray-600 font-medium text-sm">Email</label>
            <div className="flex items-center border rounded-lg p-3">
              <FaEnvelope className="text-[#58A0C8] mr-3" />
              <input
                type="email" name="email" value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required placeholder="Enter your email" className="w-full outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-gray-600 font-medium text-sm">Profile Image URL</label>
            <div className="flex items-center border rounded-lg p-3">
              <FaImage className="text-[#58A0C8] mr-3" />
              <input type="url" name="photo" placeholder="Paste image URL (optional)" className="w-full outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-gray-600 font-medium text-sm">Password</label>
            <div className="flex items-center border rounded-lg p-3">
              <FaLock className="text-[#58A0C8] mr-3" />
              <input
                type={showPassword ? "text" : "password"}
                name="password" required placeholder="Create a password" className="w-full outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Must include uppercase, lowercase, and a number (min 6 chars)</p>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white py-2.5 rounded-lg font-medium hover:opacity-95 transition cursor-pointer"
          >
            <FaUserPlus /> Sign Up as {role === "supplier" ? "Supplier" : "Consumer"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-[#34699A] font-semibold hover:underline">Login Here</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
