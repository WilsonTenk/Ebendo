/**
 * SMS sending. With SMS_PROVIDER unset, messages are only logged, which is
 * safe for development. Set SMS_PROVIDER=arkesel to send for real.
 * Other Ghanaian providers (Hubtel, mNotify) can be added as another branch.
 */
export async function sendSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.SMS_PROVIDER?.trim();

  if (!provider) {
    console.log(`[sms:dry-run] to=${to}\n${message}`);
    return { ok: true };
  }

  if (provider === "arkesel") {
    // TODO: confirm against Arkesel's current docs and test with a real key before launch.
    try {
      const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": process.env.ARKESEL_API_KEY ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: process.env.SMS_SENDER_ID ?? "Ebendo",
          message,
          recipients: [to.replace(/^\+/, "")],
        }),
      });
      if (!res.ok) return { ok: false, error: `Arkesel HTTP ${res.status}: ${await res.text()}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  return { ok: false, error: `Unknown SMS_PROVIDER "${provider}"` };
}
