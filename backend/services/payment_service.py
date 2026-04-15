import os
import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

KWD_TO_USD_RATE = 3.27


def kwd_to_cents(kwd_amount: float) -> int:
    usd = kwd_amount * KWD_TO_USD_RATE
    return max(int(round(usd * 100)), 50)


def create_payment_intent(order_id: int, amount_kwd: float, currency: str = "usd") -> dict:
    amount_cents = kwd_to_cents(amount_kwd)
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        capture_method="manual",
        metadata={"order_id": str(order_id)},
        idempotency_key=f"order_{order_id}_create",
    )
    return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}


def capture_payment(payment_intent_id: str) -> bool:
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "requires_capture":
            stripe.PaymentIntent.capture(payment_intent_id)
        return True
    except stripe.StripeError:
        return False


def cancel_payment(payment_intent_id: str) -> bool:
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status in ("requires_payment_method", "requires_capture", "requires_confirmation", "requires_action"):
            stripe.PaymentIntent.cancel(payment_intent_id)
        return True
    except stripe.StripeError:
        return False


def refund_payment(payment_intent_id: str, amount_kwd: float = None) -> dict:
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        charge_id = None
        if intent.latest_charge:
            charge_id = intent.latest_charge if isinstance(intent.latest_charge, str) else intent.latest_charge.id

        kwargs = {}
        if charge_id:
            kwargs["charge"] = charge_id
        else:
            kwargs["payment_intent"] = payment_intent_id

        if amount_kwd is not None:
            kwargs["amount"] = kwd_to_cents(amount_kwd)

        refund = stripe.Refund.create(**kwargs)
        return {"refund_id": refund.id, "status": refund.status}
    except stripe.StripeError as e:
        return {"error": str(e)}
