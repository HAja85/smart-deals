import React, { useEffect, useState, useContext, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FaArrowLeft, FaLock, FaShoppingCart, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link } from "react-router";

let stripePromise = null;
async function getStripe() {
  if (!stripePromise) {
    const res = await fetch("/api/config");
    const { stripe_publishable_key } = await res.json();
    stripePromise = loadStripe(stripe_publishable_key);
  }
  return stripePromise;
}

const CheckoutForm = ({ order, deal, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useContext(AuthContext);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded")) {
      try {
        const token = await user.getIdToken();
        await fetch(`/api/orders/${order.id}/confirm-payment`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        onSuccess();
      } catch {
        toast.error("Payment confirmed but could not update order. Contact support.");
      }
    } else {
      setErrorMsg("Payment was not completed. Please try again.");
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <FaTimesCircle className="shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        <FaLock className="inline mr-1" /> This is a sandbox payment — use card <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC.
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {processing ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
        ) : (
          <><FaLock /> Pay {parseFloat(order.total_amount).toFixed(3)} KWD</>
        )}
      </button>
    </form>
  );
};

const Payment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stripeInstance, setStripeInstance] = useState(null);
  const [succeeded, setSucceeded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const order = state?.order;
  const deal = state?.deal;
  const qty = state?.qty;

  useEffect(() => {
    if (!order || !user) { navigate("/deals"); return; }
    getStripe()
      .then(setStripeInstance)
      .catch(() => setLoadError("Could not load payment gateway. Please try again."));
  }, [order, user, navigate]);

  const handleSuccess = useCallback(() => {
    setSucceeded(true);
  }, []);

  if (!order || !deal) return null;

  if (succeeded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-emerald-500 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Authorized!</h2>
          <p className="text-gray-500 mb-1 text-sm">
            Your payment of <strong>{parseFloat(order.total_amount).toFixed(3)} KWD</strong> has been authorized.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Your card will only be charged if the deal reaches its target. If the deal fails, your payment is automatically cancelled.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium text-gray-800">{deal.product?.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-medium text-gray-800">{qty} units</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-[#34699A]">{parseFloat(order.total_amount).toFixed(3)} KWD</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-emerald-600 font-semibold">Authorized</span></div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate("/my-orders")}
              className="w-full py-3 bg-gradient-to-r from-[#34699A] to-[#58A0C8] text-white font-bold rounded-xl hover:opacity-90 transition cursor-pointer">
              View My Orders
            </button>
            <button onClick={() => navigate("/deals")}
              className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition cursor-pointer">
              Browse More Deals
            </button>
          </div>
        </div>
      </div>
    );
  }

  const product = deal.product || {};
  const discountPct = deal.discount_percent || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={`/deals/${deal._id || deal.id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#34699A] mb-6 transition text-sm font-medium">
          <FaArrowLeft /> Back to Deal
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-5 sticky top-24">
              <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <FaShoppingCart className="text-[#34699A]" /> Order Summary
              </h2>
              <img
                src={product.image || "https://placehold.co/400x300?text=Product"}
                alt={product.title}
                className="w-full h-36 object-cover rounded-xl mb-4"
              />
              <h3 className="font-semibold text-gray-800 mb-1">{product.title}</h3>
              {product.brand && <p className="text-xs text-gray-400 mb-3">{product.brand}</p>}

              <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>Deal Price</span>
                  <span>{parseFloat(deal.price_per_unit).toFixed(3)} KWD / unit</span>
                </div>
                {deal.actual_price && (
                  <div className="flex justify-between text-gray-400">
                    <span>Market Price</span>
                    <span className="line-through">{parseFloat(deal.actual_price).toFixed(3)} KWD</span>
                  </div>
                )}
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{discountPct}%</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Quantity</span>
                  <span>{qty} units</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-[#34699A] text-base">
                  <span>Total</span>
                  <span>{parseFloat(order.total_amount).toFixed(3)} KWD</span>
                </div>
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                Your card is <strong>authorized now</strong> but only <strong>charged if the deal succeeds</strong>. No charge if the deal fails.
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-bold text-gray-800 text-xl mb-1">Secure Payment</h2>
              <p className="text-gray-400 text-sm mb-6">Complete your payment to join this group deal</p>

              {loadError ? (
                <div className="text-red-500 text-center py-8">{loadError}</div>
              ) : stripeInstance && order.stripe_client_secret ? (
                <Elements
                  stripe={stripeInstance}
                  options={{
                    clientSecret: order.stripe_client_secret,
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "#34699A", borderRadius: "12px" },
                    },
                  }}
                >
                  <CheckoutForm order={order} deal={deal} onSuccess={handleSuccess} />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-[#58A0C8] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
