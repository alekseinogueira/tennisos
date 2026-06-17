// supabase/functions/send-session-reminder/index.ts
//
// Sends the 55TC session-reminder email via Resend.
// POST body: { student_name, student_email, scheduled_at, duration_minutes, location }
//   - scheduled_at is a UTC ISO string; formatted for display in America/Vancouver.
// Secret: RESEND_API_KEY (Supabase Edge Function secret — never hardcoded, never a VITE_ var)

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Aleksei Nogueira <55tc@55tenniscrew.com>";
const SUBJECT = "See you on the court.";
const PORTAL_URL = "https://portal.55tenniscrew.com";
const TZ = "America/Vancouver";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// "Tuesday, June 24" — pinned to the coach's zone so a UTC instant reads right.
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

// "10:00 AM"
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function buildEmailHtml(
  studentName: string,
  scheduledAt: string,
  durationMinutes: number,
  location: string | null,
): string {
  const dateStr = formatDate(scheduledAt);
  const timeStr = formatTime(scheduledAt);
  const durationStr = `${durationMinutes} minutes`;
  const locationStr = location && location.trim() ? location : "To be confirmed";

  const infoRow = (label: string, value: string) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(28,53,38,0.08);">
            <div style="font-size: 10px; font-weight: 500; color: #1C3526; opacity: 0.45; letter-spacing: 3px; text-transform: uppercase;">${label}</div>
            <div style="font-size: 16px; font-weight: 500; color: #1C3526; margin-top: 4px;">${value}</div>
          </td>
        </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>55TC — See you on the court.</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background-color: #EDEAE3; font-family: 'DM Sans', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 560px; margin: 0 auto; background-color: #EDEAE3; }
  .header { background-color: #1C3526; padding: 32px 40px 28px; position: relative; overflow: hidden; }
  .logo-wrap { position: relative; margin-bottom: 28px; }
  .header-headline { font-family: 'Bebas Neue', 'Arial Black', sans-serif; font-size: 52px; color: #F5EDE0; letter-spacing: 2px; line-height: 0.95; position: relative; }
  .header-sub { font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; font-weight: 500; color: #F5EDE0; opacity: 0.5; letter-spacing: 3px; text-transform: uppercase; margin-top: 12px; position: relative; }
  .body { padding: 40px 40px 8px; background-color: #F5EDE0; }
  .body p { font-size: 15px; color: #1C3526; line-height: 1.7; font-weight: 400; }
  .body p + p { margin-top: 16px; }
  .name-highlight { font-weight: 500; }
  .info-block { padding: 8px 40px 24px; background-color: #F5EDE0; }
  .info-card { background-color: #FFFFFF; border: 1px solid rgba(28,53,38,0.10); border-radius: 4px; padding: 8px 24px; }
  .info-card table { width: 100%; border-collapse: collapse; }
  .info-card tr:last-child td { border-bottom: none !important; }
  .signoff { padding: 8px 40px 36px; background-color: #F5EDE0; }
  .signoff p { font-size: 15px; color: #1C3526; line-height: 1.7; }
  .cta-block { padding: 32px 40px; background-color: #F5EDE0; border-top: 1px solid rgba(28,53,38,0.08); }
  .cta-label { font-size: 10px; font-weight: 500; color: #1C3526; opacity: 0.45; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px; }
  .cta-button { display: inline-block; background-color: #1C3526; color: #F5EDE0; font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; padding: 16px 32px; border-radius: 3px; }
  .footer { background-color: #1C3526; padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; }
  .footer svg { height: 20px; width: auto; opacity: 0.35; }
  .footer-tagline { font-size: 10px; color: #F5EDE0; opacity: 0.25; letter-spacing: 2px; text-transform: uppercase; font-weight: 500; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo-wrap">
      <img src="https://vdyvlylacsghnvtllrzj.supabase.co/storage/v1/object/public/assets/55tcos-email-logo.png" alt="55TC OS" height="24" style="display:block;height:24px;width:auto;" />
    </div>
    <div class="header-headline">SEE YOU<br>ON THE<br>COURT.</div>
    <div class="header-sub">55TC · Vancouver</div>
  </div>
  <div class="body">
    <p>Hey <span class="name-highlight">${studentName}</span>,</p>
    <p>Just confirmed — you have a session coming up. Here are the details:</p>
  </div>
  <div class="info-block">
    <div class="info-card">
      <table>
        ${infoRow("Date", dateStr)}
        ${infoRow("Time", timeStr)}
        ${infoRow("Duration", durationStr)}
        ${infoRow("Location", locationStr)}
      </table>
    </div>
  </div>
  <div class="signoff">
    <p>See you there. Less Theory. More Game.</p>
    <p style="margin-top: 20px; font-weight: 500;">— Aleksei</p>
  </div>
  <div class="cta-block">
    <div class="cta-label">Your court</div>
    <a href="${PORTAL_URL}" class="cta-button">VIEW MY PORTAL →</a>
  </div>
  <div class="footer">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 218" aria-label="55TC OS">
      <g transform="translate(-149.8,610.864) scale(0.1,-0.1)" fill="#F5EDE0" stroke="none">
        <path d="M7609 6025 c-437 -83 -763 -369 -871 -765 -31 -113 -33 -344 -4 -460 48 -193 124 -328 266 -471 153 -154 292 -234 517 -297 91 -25 112 -27 288 -27 221 0 278 12 453 95 104 50 222 125 222 142 0 11 -249 368 -256 368 -3 0 -35 -18 -72 -40 -100 -60 -177 -82 -311 -88 -88 -3 -129 0 -180 13 -192 51 -349 192 -400 359 -44 144 -35 261 29 392 150 306 565 406 881 212 25 -15 49 -28 52 -28 3 0 54 69 113 153 59 83 118 166 131 184 l24 31 -83 55 c-105 70 -208 119 -323 153 -76 22 -113 27 -245 30 -107 2 -179 -1 -231 -11z"/>
        <path d="M1688 6011 c-40 -4 -62 -12 -72 -26 -13 -17 -15 -99 -16 -597 l0 -577 22 -21 c17 -15 35 -20 77 -20 31 0 208 -1 393 -2 401 -4 373 6 373 -124 0 -73 -3 -88 -19 -100 -16 -11 -88 -14 -400 -14 -392 0 -447 -5 -466 -40 -6 -11 -10 -107 -10 -230 0 -211 0 -211 25 -235 l24 -25 523 0 c580 1 598 2 723 64 135 67 215 180 236 336 12 90 11 450 -1 535 -25 168 -123 283 -290 337 -57 18 -96 21 -322 26 l-258 4 0 89 0 89 359 0 360 0 28 24 28 24 0 204 c0 111 -3 215 -8 230 -15 54 -5 53 -652 54 -330 1 -626 -1 -657 -5z"/>
        <path d="M3465 6013 c-73 -6 -86 -12 -101 -48 -12 -28 -14 -128 -14 -573 0 -558 2 -592 41 -613 12 -6 134 -10 322 -9 346 0 472 -6 493 -27 10 -10 14 -39 14 -97 0 -68 -3 -86 -18 -99 -17 -15 -59 -17 -399 -17 -209 0 -395 -3 -412 -6 -57 -12 -66 -38 -70 -217 -4 -195 3 -261 32 -287 20 -19 37 -20 547 -20 488 0 532 1 602 19 181 47 291 145 339 302 19 62 20 89 17 366 -3 287 -4 300 -27 358 -17 43 -42 77 -85 121 -109 108 -214 134 -552 134 l-204 0 0 90 0 89 366 3 366 3 19 24 c17 21 19 41 19 237 0 211 0 213 -24 241 l-24 28 -604 1 c-331 1 -621 0 -643 -3z"/>
        <path d="M4972 5774 l3 -227 265 2 c146 1 273 -1 283 -4 16 -7 17 -55 17 -756 l0 -749 270 0 270 0 0 755 0 755 285 0 285 0 0 225 0 225 -840 0 -840 0 2 -226z"/>
        <path d="M7745 5458 c-83 -9 -174 -44 -185 -71 -4 -12 -12 -58 -18 -102 -14 -104 -63 -257 -119 -368 l-44 -88 27 -49 c36 -66 130 -155 197 -185 73 -34 158 -48 242 -42 116 9 129 17 144 90 27 132 104 277 203 383 l62 66 -13 46 c-25 94 -97 192 -186 251 -84 57 -197 82 -310 69z"/>
        <path d="M7478 5333 c-89 -96 -130 -199 -130 -326 0 -45 5 -93 10 -107 9 -24 11 -22 41 38 39 78 85 213 105 314 24 119 21 130 -26 81z"/>
        <path d="M8217 5011 c-53 -59 -120 -164 -150 -236 -29 -71 -59 -167 -53 -173 8 -8 94 58 131 100 73 85 122 224 113 318 l-3 33 -38 -42z"/>
      </g>
      <text x="734" y="178" font-family="'Bebas Neue','Arial Black',sans-serif" font-size="195" font-weight="400" fill="#F5EDE0" fill-opacity="0.38" letter-spacing="-2">OS</text>
    </svg>
    <span class="footer-tagline">Less Theory. More Game.</span>
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return json({ error: "Email service is not configured." }, 500);
  }

  let payload: {
    student_name?: string;
    student_email?: string;
    scheduled_at?: string;
    duration_minutes?: number;
    location?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { student_name, student_email, scheduled_at, duration_minutes, location } =
    payload;
  if (!student_name || !student_email || !scheduled_at || !duration_minutes) {
    return json(
      {
        error:
          "student_name, student_email, scheduled_at and duration_minutes are required.",
      },
      400,
    );
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [student_email],
      subject: SUBJECT,
      html: buildEmailHtml(
        student_name,
        scheduled_at,
        duration_minutes,
        location ?? null,
      ),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend API error:", res.status, detail);
    return json({ error: "Failed to send session reminder email." }, 502);
  }

  return json({ success: true });
});
