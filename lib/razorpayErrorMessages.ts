/**
 * Maps raw Razorpay failure reasons / status strings to user-friendly text.
 * Used by /subscription/failure to avoid surfacing developer jargon like
 * "Unverified Failure" or `BAD_REQUEST_ERROR` directly to end users.
 *
 * The function is permissive: it accepts the upstream `reason` string, the
 * payment-log `status`, and the row's `message`. It picks the most useful
 * signal available and returns:
 *   - title:  short, user-friendly headline ("Card declined", "Payment cancelled")
 *   - detail: longer explanation + suggested next step
 */

export type FailureCopy = {
  title: string;
  detail: string;
};

const DEFAULT_FAILURE: FailureCopy = {
  title: "Payment could not be completed",
  detail:
    "Something went wrong while processing your payment. Please try again, or use a different card / payment method.",
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function mapRazorpayFailure(args: {
  reason?: string | null;
  status?: string | null;
  message?: string | null;
  errorCode?: string | null;
  errorSource?: string | null;
}): FailureCopy {
  const haystack = [
    args.reason,
    args.message,
    args.errorCode,
    args.errorSource,
    args.status,
  ]
    .map(normalize)
    .join(" | ");

  // User explicitly cancelled / closed the checkout
  if (
    haystack.includes("cancel") ||
    haystack.includes("closed by user") ||
    haystack.includes("user cancelled") ||
    haystack.includes("payment_cancelled") ||
    haystack.includes("payment cancelled")
  ) {
    return {
      title: "Payment cancelled",
      detail:
        "You closed the payment window before completing the transaction. No money has been charged. You can try again whenever you're ready.",
    };
  }

  // Card declined / insufficient funds / authentication failures
  if (
    haystack.includes("declined") ||
    haystack.includes("insufficient") ||
    haystack.includes("card_declined") ||
    haystack.includes("payment_failed") ||
    haystack.includes("auth") ||
    haystack.includes("authentication")
  ) {
    if (haystack.includes("insufficient")) {
      return {
        title: "Insufficient balance",
        detail:
          "Your bank reported insufficient balance for this transaction. Please try a different card or payment method.",
      };
    }
    if (haystack.includes("auth") || haystack.includes("authentication")) {
      return {
        title: "Card authentication failed",
        detail:
          "Your bank could not verify the transaction (OTP or 3-D Secure failed). Please retry with the correct OTP, or try a different card.",
      };
    }
    return {
      title: "Card declined",
      detail:
        "Your bank declined this transaction. Please try a different card, check with your bank, or use UPI / net-banking instead.",
    };
  }

  // Network / gateway / timeout
  if (
    haystack.includes("timeout") ||
    haystack.includes("network") ||
    haystack.includes("gateway") ||
    haystack.includes("server_error") ||
    haystack.includes("internal")
  ) {
    return {
      title: "Network or gateway error",
      detail:
        "Your payment did not reach the bank cleanly due to a network or gateway issue. If money was debited, it will be auto-refunded within 5–7 working days; otherwise please retry.",
    };
  }

  // Bad request — unusual; usually amount/order id mismatch
  if (haystack.includes("bad_request") || haystack.includes("invalid")) {
    return {
      title: "Payment request rejected",
      detail:
        "The payment request was rejected. This is unusual — please try again, and contact support if the problem persists.",
    };
  }

  // Generic but more polite than "Unverified Failure"
  return DEFAULT_FAILURE;
}
