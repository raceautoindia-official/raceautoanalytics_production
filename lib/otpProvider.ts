export type OtpDispatchPayload = {
  phoneNumber: string;
  otpCode: string;
};

export type OtpDispatchResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

type OtpProvider = {
  sendOtp: (payload: OtpDispatchPayload) => Promise<OtpDispatchResult>;
};

const mockProvider: OtpProvider = {
  async sendOtp({ phoneNumber, otpCode }) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[otp:mock] ${phoneNumber} => ${otpCode}`);
    }
    return { ok: true, provider: "mock" };
  },
};

const msg91Provider: OtpProvider = {
  async sendOtp({ phoneNumber, otpCode }) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;

    if (!authKey || !templateId) {
      return {
        ok: false,
        provider: "msg91",
        error: "MSG91 configuration is incomplete",
      };
    }

    const payload = {
      template_id: templateId,
      mobile: phoneNumber.replace(/^\+/, ""),
      authkey: authKey,
      otp: otpCode,
      otp_length: 6,
      otp_expiry: Number.parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
      ...(senderId ? { sender: senderId } : {}),
    };

    try {
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.type === "error") {
        return {
          ok: false,
          provider: "msg91",
          error: data?.message || "MSG91 OTP request failed",
        };
      }

      return {
        ok: true,
        provider: "msg91",
        messageId: data?.request_id,
      };
    } catch (error: any) {
      return {
        ok: false,
        provider: "msg91",
        error: error?.message || "MSG91 request error",
      };
    }
  },
};

function resolveProvider(): OtpProvider {
  const provider = (process.env.OTP_PROVIDER || "mock").toLowerCase();

  if (provider === "msg91") {
    return msg91Provider;
  }

  return mockProvider;
}

export async function sendOtpCode(payload: OtpDispatchPayload): Promise<OtpDispatchResult> {
  const provider = resolveProvider();
  return provider.sendOtp(payload);
}
