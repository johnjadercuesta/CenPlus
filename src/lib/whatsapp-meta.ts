const API_VERSION = "v22.0";

function getPhoneId(): string {
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_ID no configurado");
  return id;
}

function getToken(): string {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN no configurado");
  return token;
}

function formatPhone(phone: string): string {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("57") && p.length >= 12) return "+" + p;
  if (p.startsWith("0")) p = p.slice(1);
  if (!p.startsWith("57")) p = "57" + p;
  return "+" + p;
}

export function isConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TOKEN);
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  parameters: string[] = [],
  languageCode: string = "es"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phone = formatPhone(to);
    const body: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (parameters.length > 0) {
      body.template.components = [
        {
          type: "body",
          parameters: parameters.map((p) => ({ type: "text", text: p })),
        },
      ];
    }

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${getPhoneId()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error?.message || "Error desconocido de Meta" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Error de conexión" };
  }
}

export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phone = formatPhone(to);

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${getPhoneId()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { preview_url: false, body },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error?.message || "Error desconocido de Meta" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Error de conexión" };
  }
}
