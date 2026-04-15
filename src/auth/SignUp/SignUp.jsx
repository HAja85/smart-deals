import React, { useState, useContext } from "react";
import {
  FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserPlus,
  FaShoppingCart, FaInfoCircle, FaPhone, FaKey, FaCheckCircle,
} from "react-icons/fa";
import ImageUploader from "../../components/ImageUploader/ImageUploader";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";

const OTP_EXPIRY = 10;

const VerifyField = ({ label, icon, type, value, onChange, placeholder, otpSent, demoOtp, otpValue, onOtpChange, onSend, verified, sending }) => (
  <div className={`rounded-xl border-2 p-4 transition-colors ${verified ? "border-emerald-300 bg-emerald-50/40" : otpSent ? "border-[#34699A]/30 bg-blue-50/30" : "border-gray-200"}`}>
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      {verified && <span className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold"><FaCheckCircle /> Verified</span>}
    </div>

    <div className="flex gap-2">
      <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 flex-1 bg-white focus-within:border-[#34699A] transition">
        {icon}
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={verified}
          className="flex-1 outline-none text-sm ml-2 bg-transparent disabled:text-gray-400"
        />
      </div>
      {!verified && (
        <button type="button" onClick={onSend} disabled={sending || !value.trim()}
          className="px-3 py-2.5 bg-[#34699A] text-white text-xs font-medium rounded-lg hover:bg-[#2a5580] transition disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5 shrink-0">
          {sending
            ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
            : <><FaKey /> {otpSent ? "Resend" : "Send OTP"}</>
          }
        </button>
      )}
    </div>

    {otpSent && !verified && (
      <>
        {demoOtp && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-amber-600 font-medium">Demo — OTP generated (SMS in production)</p>
              <p className="text-xs text-amber-500 mt-0.5">Expires in {OTP_EXPIRY} minutes</p>
            </div>
            <span className="font-mono font-bold text-xl text-amber-800 tracking-widest shrink-0">{demoOtp}</span>
          </div>
        )}
        <div className="mt-2 flex gap-2">
          <input
            type="text" maxLength={6} value={otpValue} onChange={onOtpChange}
            placeholder="Enter 6-digit OTP"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#34699A] transition font-mono tracking-widest text-center"
          />
        </div>
      </>
    )}
  </div>
);

const SignUp = () => {
  const { loginUser, setEmailInput } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", mobile: "", photo: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailDemoOtp, setEmailDemoOtp] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileDemoOtp, setMobileDemoOtp] = useState("");
  const [mobileOtpInput, setMobileOtpInput] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const setF = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (key === "email") { setEmailVerified(false); setEmailOtpSent(false); setEmailDemoOtp(""); setEmailOtpInput(""); }
    if (key === "mobile") { setMobileVerified(false); setMobileOtpSent(false); setMobileDemoOtp(""); setMobileOtpInput(""); }
  };

  const sendEmailOtp = async () => {
    if (!form.email.trim()) { toast.error("Enter your email first"); return; }
    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setEmailOtpSent(true);
      setEmailDemoOtp(data.otp);
      toast.info(`OTP sent to ${form.email}`);
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setEmailSending(false);
    }
  };

  const sendMobileOtp = async () => {
    if (!form.mobile.trim()) { toast.error("Enter your mobile number first"); return; }
    setMobileSending(true);
    try {
      const res = await fetch("/api/auth/send-mobile-otp", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: form.mobile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMobileOtpSent(true);
      setMobileDemoOtp(data.otp);
      toast.info(`OTP sent to ${form.mobile}`);
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setMobileSending(false);
    }
  };

  const verifyEmailOtp = () => {
    if (emailOtpInput.trim() === emailDemoOtp) {
      setEmailVerified(true);
      toast.success("Email verified!");
    } else {
      toast.error("Incorrect email OTP");
    }
  };

  const verifyMobileOtp = () => {
    if (mobileOtpInput.trim() === mobileDemoOtp) {
      setMobileVerified(true);
      toast.success("Mobile number verified!");
    } else {
      toast.error("Incorrect mobile OTP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailVerified) { toast.error("Please verify your email first"); return; }
    if (!mobileVerified) { toast.error("Please verify your mobile number first"); return; }

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!pwRegex.test(form.password)) {
      toast.error("Password must include uppercase, lowercase, and a number (min 6 chars)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          mobile_number: form.mobile, email_otp: emailOtpInput,
          mobile_otp: mobileOtpInput, image: form.photo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      await loginUser(form.email, form.password);
      toast.success("Account created! Welcome to SmartDeals Kuwait.");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const bothVerified = emailVerified && mobileVerified;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-sky-100 via-white to-[#E0F8F5] py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#58A0C8]">
        <div className="p-8 pb-4">
          <h2 className="text-3xl font-bold text-center text-[#34699A] mb-2">Create Account</h2>
          <div className="flex items-center gap-2 mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <FaShoppingCart className="text-[#34699A] shrink-0" />
            <p className="text-sm text-gray-600">
              Registering as a <strong className="text-[#34699A]">Consumer</strong>.
              Supplier accounts are managed by our admin team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-600 font-medium text-sm">Full Name</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#34699A] transition">
                <FaUser className="text-[#58A0C8] mr-2 shrink-0" />
                <input type="text" value={form.name} onChange={setF("name")} required
                  placeholder="Enter your full name" className="w-full outline-none text-sm" />
              </div>
            </div>

            <ImageUploader
              value={form.photo}
              onChange={url => setForm(f => ({ ...f, photo: url }))}
              label="Profile Image (optional)"
            />

            <div>
              <label className="block mb-1 text-gray-600 font-medium text-sm">Password</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-[#34699A] transition">
                <FaLock className="text-[#58A0C8] mr-2 shrink-0" />
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={setF("password")}
                  required placeholder="Uppercase + lowercase + number, min 6" className="w-full outline-none text-sm" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="text-gray-400 hover:text-gray-600 ml-1">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identity Verification</p>

              <div className="space-y-3">
                <VerifyField
                  label="Email Address"
                  icon={<FaEnvelope className="text-[#58A0C8] shrink-0" />}
                  type="email"
                  value={form.email}
                  onChange={(e) => { setF("email")(e); setEmailInput(e.target.value); }}
                  placeholder="your@email.com"
                  otpSent={emailOtpSent}
                  demoOtp={emailDemoOtp}
                  otpValue={emailOtpInput}
                  onOtpChange={e => setEmailOtpInput(e.target.value)}
                  onSend={sendEmailOtp}
                  verified={emailVerified}
                  sending={emailSending}
                />
                {emailOtpSent && !emailVerified && (
                  <button type="button" onClick={verifyEmailOtp} disabled={emailOtpInput.length !== 6}
                    className="w-full py-2 border-2 border-[#34699A] text-[#34699A] text-sm font-semibold rounded-lg hover:bg-[#34699A] hover:text-white transition disabled:opacity-40">
                    Verify Email OTP
                  </button>
                )}

                <VerifyField
                  label="Mobile Number"
                  icon={<FaPhone className="text-[#58A0C8] shrink-0" />}
                  type="tel"
                  value={form.mobile}
                  onChange={setF("mobile")}
                  placeholder="+965 XXXX XXXX"
                  otpSent={mobileOtpSent}
                  demoOtp={mobileDemoOtp}
                  otpValue={mobileOtpInput}
                  onOtpChange={e => setMobileOtpInput(e.target.value)}
                  onSend={sendMobileOtp}
                  verified={mobileVerified}
                  sending={mobileSending}
                />
                {mobileOtpSent && !mobileVerified && (
                  <button type="button" onClick={verifyMobileOtp} disabled={mobileOtpInput.length !== 6}
                    className="w-full py-2 border-2 border-[#34699A] text-[#34699A] text-sm font-semibold rounded-lg hover:bg-[#34699A] hover:text-white transition disabled:opacity-40">
                    Verify Mobile OTP
                  </button>
                )}
              </div>
            </div>

            <button type="submit" disabled={!bothVerified || submitting}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
                bothVerified
                  ? "bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white hover:opacity-90 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}>
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                : bothVerified
                  ? <><FaCheckCircle /> Create Verified Account</>
                  : <><FaUserPlus /> Verify email & mobile to continue</>
              }
            </button>

            <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <FaInfoCircle className="shrink-0 mt-0.5 text-gray-300" />
              <span>Want to sell on SmartDeals? Contact our admin team to get a Supplier account.</span>
            </div>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-[#34699A] font-semibold hover:underline">Login Here</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
