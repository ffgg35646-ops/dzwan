import crypto from "node:crypto";
import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user,
      pass,
    },
  });
}

export function createOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp: string): string {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

export async function sendCaptainRegistrationOtp(
  to: string,
  otp: string,
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"DZWAN" <${process.env.SMTP_USER}>`,
    to,
    subject: "رمز التحقق الخاص بك | DZWAN",

    text: `مرحبًا بك في DZWAN

رمز التحقق الخاص بك هو:
${otp}

صلاحية الرمز 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

فريق DZWAN`,

    html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد البريد الإلكتروني - DZWAN</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f7fa;
  font-family:Arial,Tahoma,sans-serif;
  color:#1f2937;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f5f7fa;padding:35px 15px;"
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:18px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                padding:28px 20px;
                background:linear-gradient(135deg,#f59e0b,#f97316);
              "
            >
              <div style="
                display:inline-block;
                padding:10px 18px;
                border:2px solid rgba(255,255,255,0.35);
                border-radius:14px;
                color:#ffffff;
                font-size:26px;
                font-weight:800;
                letter-spacing:2px;
              ">
                DZWAN
              </div>

              <div style="
                color:#fff7ed;
                font-size:14px;
                margin-top:10px;
              ">
                منصة التوصيل الخاصة بك
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:38px 32px 25px;">

              <div style="
                display:inline-block;
                background:#fff7ed;
                color:#ea580c;
                padding:8px 13px;
                border-radius:999px;
                font-size:13px;
                font-weight:700;
                margin-bottom:18px;
              ">
                تأكيد البريد الإلكتروني
              </div>

              <h1 style="
                margin:0 0 12px;
                font-size:26px;
                color:#111827;
              ">
                تأكيد حسابك في DZWAN
              </h1>

              <p style="
                margin:0 0 26px;
                line-height:1.9;
                font-size:15px;
                color:#6b7280;
              ">
                استخدم رمز التحقق التالي لإكمال عملية التسجيل.
                لا تشارك هذا الرمز مع أي شخص.
              </p>

              <!-- OTP -->
              <div style="
                margin:0 auto 24px;
                padding:22px 15px;
                background:#fff7ed;
                border:1px solid #fed7aa;
                border-radius:16px;
                text-align:center;
              ">
                <div style="
                  font-size:12px;
                  color:#9a3412;
                  margin-bottom:10px;
                  font-weight:700;
                ">
                  رمز التحقق
                </div>

                <div style="
                  font-size:38px;
                  line-height:1;
                  font-weight:900;
                  letter-spacing:10px;
                  color:#ea580c;
                  direction:ltr;
                  text-align:center;
                ">
                  ${otp}
                </div>
              </div>

              <!-- Expiration -->
              <div style="
                padding:14px 16px;
                background:#f9fafb;
                border-radius:12px;
                font-size:13px;
                color:#6b7280;
                line-height:1.8;
              ">
                ⏱️ صلاحية الرمز:
                <strong style="color:#374151;">10 دقائق</strong>
                فقط.
              </div>

              <div style="
                margin-top:20px;
                font-size:13px;
                line-height:1.8;
                color:#9ca3af;
              ">
                إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل الرسالة بأمان.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                padding:20px 25px;
                background:#f9fafb;
                border-top:1px solid #f1f5f9;
                text-align:center;
              "
            >
              <div style="
                font-size:13px;
                color:#6b7280;
              ">
                © ${new Date().getFullYear()} DZWAN
              </div>

              <div style="
                margin-top:5px;
                font-size:12px;
                color:#9ca3af;
              ">
                هذه رسالة تلقائية، يرجى عدم الرد عليها.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`,
  });
}


export async function sendEstablishmentRegistrationOtp(
  to: string,
  otp: string,
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"DZWAN" <${process.env.SMTP_USER}>`,
    to,
    subject: "رمز التحقق الخاص بك | DZWAN",

    text: `مرحبًا بك في DZWAN

رمز التحقق الخاص بتسجيل المطعم/المحل هو:
${otp}

صلاحية الرمز 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

ملاحظة: قد تصل رسالة التحقق إلى مجلد الرسائل غير المرغوب فيها (Spam).

فريق DZWAN`,

    html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد البريد الإلكتروني - DZWAN</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Tahoma,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fa;padding:35px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

          <tr>
            <td align="center" style="padding:28px 20px;background:linear-gradient(135deg,#f59e0b,#f97316);">
              <div style="display:inline-block;padding:10px 18px;border:2px solid rgba(255,255,255,0.35);border-radius:14px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;">
                DZWAN
              </div>
              <div style="color:#fff7ed;font-size:14px;margin-top:10px;">
                منصة التوصيل الخاصة بك
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:38px 32px 25px;">
              <div style="display:inline-block;background:#fff7ed;color:#ea580c;padding:8px 13px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:18px;">
                تأكيد حساب المطعم / المحل
              </div>

              <h1 style="margin:0 0 12px;font-size:26px;color:#111827;">
                تأكيد البريد الإلكتروني
              </h1>

              <p style="margin:0 0 26px;line-height:1.9;font-size:15px;color:#6b7280;">
                استخدم رمز التحقق التالي لإكمال عملية تسجيل نشاطك في DZWAN.
                لا تشارك هذا الرمز مع أي شخص.
              </p>

              <div style="margin:0 auto 24px;padding:22px 15px;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;text-align:center;">
                <div style="font-size:12px;color:#9a3412;margin-bottom:10px;font-weight:700;">
                  رمز التحقق
                </div>

                <div style="font-size:38px;line-height:1;font-weight:900;letter-spacing:10px;color:#ea580c;direction:ltr;text-align:center;">
                  ${otp}
                </div>
              </div>

              <div style="padding:14px 16px;background:#f9fafb;border-radius:12px;font-size:13px;color:#6b7280;line-height:1.8;">
                ⏱️ صلاحية الرمز:
                <strong style="color:#374151;">10 دقائق</strong>.
              </div>

              <div style="margin-top:18px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;font-size:13px;line-height:1.8;color:#9a3412;">
                📩 ملاحظة مهمة: قد تصل رسالة التحقق إلى مجلد
                <strong>Spam / الرسائل غير المرغوب فيها</strong>.
                يرجى التحقق منه إذا لم تظهر الرسالة في البريد الوارد.
              </div>

              <div style="margin-top:18px;font-size:13px;line-height:1.8;color:#9ca3af;">
                إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل الرسالة بأمان.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 25px;background:#f9fafb;border-top:1px solid #f1f5f9;text-align:center;">
              <div style="font-size:13px;color:#6b7280;">
                © ${new Date().getFullYear()} DZWAN
              </div>
              <div style="margin-top:5px;font-size:12px;color:#9ca3af;">
                هذه رسالة تلقائية، يرجى عدم الرد عليها.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  });
}


export async function sendPasswordResetOtp(
  to: string,
  otp: string,
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"DZWAN" <${process.env.SMTP_USER}>`,
    to,
    subject: "إعادة تعيين كلمة المرور | DZWAN",

    text: `مرحبًا بك في DZWAN

رمز إعادة تعيين كلمة المرور هو:
${otp}

صلاحية الرمز 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

ملاحظة: قد تصل رسالة التحقق إلى مجلد الرسائل غير المرغوب فيها (Spam).

فريق DZWAN`,

    html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>إعادة تعيين كلمة المرور - DZWAN</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f7fa;
  font-family:Arial,Tahoma,sans-serif;
  color:#1f2937;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background:#f5f7fa;padding:35px 15px;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:18px;
    overflow:hidden;
    box-shadow:0 8px 30px rgba(0,0,0,0.08);
  ">

<tr>
<td align="center"
  style="
    padding:28px 20px;
    background:linear-gradient(135deg,#f59e0b,#f97316);
  ">
  <div style="
    display:inline-block;
    padding:10px 18px;
    border:2px solid rgba(255,255,255,0.35);
    border-radius:14px;
    color:#ffffff;
    font-size:26px;
    font-weight:800;
    letter-spacing:2px;
  ">
    DZWAN
  </div>

  <div style="
    color:#fff7ed;
    font-size:14px;
    margin-top:10px;
  ">
    منصة التوصيل الخاصة بك
  </div>
</td>
</tr>

<tr>
<td style="padding:38px 32px 25px;">

<div style="
  display:inline-block;
  background:#fff7ed;
  color:#ea580c;
  padding:8px 13px;
  border-radius:999px;
  font-size:13px;
  font-weight:700;
  margin-bottom:18px;
">
  أمان الحساب
</div>

<h1 style="
  margin:0 0 12px;
  font-size:26px;
  color:#111827;
">
  إعادة تعيين كلمة المرور
</h1>

<p style="
  margin:0 0 26px;
  line-height:1.9;
  font-size:15px;
  color:#6b7280;
">
  تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في DZWAN.
  استخدم الرمز التالي لإكمال العملية.
</p>

<div style="
  margin:0 auto 24px;
  padding:22px 15px;
  background:#fff7ed;
  border:1px solid #fed7aa;
  border-radius:16px;
  text-align:center;
">
  <div style="
    font-size:12px;
    color:#9a3412;
    margin-bottom:10px;
    font-weight:700;
  ">
    رمز التحقق
  </div>

  <div style="
    font-size:38px;
    line-height:1;
    font-weight:900;
    letter-spacing:10px;
    color:#ea580c;
    direction:ltr;
    text-align:center;
  ">
    ${otp}
  </div>
</div>

<div style="
  padding:14px 16px;
  background:#f9fafb;
  border-radius:12px;
  font-size:13px;
  color:#6b7280;
  line-height:1.8;
">
  ⏱️ صلاحية الرمز:
  <strong style="color:#374151;">10 دقائق</strong>.
</div>

<div style="
  margin-top:18px;
  padding:14px 16px;
  background:#fff7ed;
  border:1px solid #fed7aa;
  border-radius:12px;
  font-size:13px;
  line-height:1.8;
  color:#9a3412;
">
  📩 ملاحظة مهمة: قد تصل رسالة التحقق إلى مجلد
  <strong>Spam / الرسائل غير المرغوب فيها</strong>.
  يرجى التحقق منه إذا لم تظهر الرسالة في البريد الوارد.
</div>

<div style="
  margin-top:18px;
  font-size:13px;
  line-height:1.8;
  color:#9ca3af;
">
  إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة بأمان.
</div>

</td>
</tr>

<tr>
<td style="
  padding:20px 25px;
  background:#f9fafb;
  border-top:1px solid #f1f5f9;
  text-align:center;
">
  <div style="font-size:13px;color:#6b7280;">
    © ${new Date().getFullYear()} DZWAN
  </div>

  <div style="
    margin-top:5px;
    font-size:12px;
    color:#9ca3af;
  ">
    هذه رسالة تلقائية، يرجى عدم الرد عليها.
  </div>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
`,
  });
}


export async function sendEmailChangeOtp(
  to: string,
  otp: string,
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"DZWAN" <${process.env.SMTP_USER}>`,
    to,
    subject: "تأكيد تغيير البريد الإلكتروني | DZWAN",

    text: `مرحبًا بك في DZWAN

رمز تأكيد تغيير البريد الإلكتروني هو:
${otp}

صلاحية الرمز 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

فريق DZWAN`,

    html: `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0;padding:30px;background:#f5f7fa;font-family:Arial,Tahoma,sans-serif;">
  <div style="
    max-width:560px;
    margin:0 auto;
    background:#ffffff;
    border-radius:20px;
    padding:30px;
    text-align:center;
    box-shadow:0 8px 30px rgba(0,0,0,.08);
  ">
    <h2 style="margin:0 0 16px;color:#111827;">تأكيد تغيير البريد الإلكتروني</h2>

    <p style="color:#6b7280;line-height:1.8;">
      استخدم الرمز التالي لتأكيد البريد الإلكتروني الجديد:
    </p>

    <div style="
      margin:24px auto;
      width:max-content;
      min-width:180px;
      padding:18px 28px;
      border-radius:16px;
      background:#eff6ff;
      color:#2563eb;
      font-size:32px;
      font-weight:900;
      letter-spacing:8px;
    ">
      ${otp}
    </div>

    <p style="color:#6b7280;">
      صلاحية الرمز 10 دقائق.
    </p>
  </div>
</body>
</html>
`,
  });
}
