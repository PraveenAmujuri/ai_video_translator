export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, name, email, title, description, extra } = req.body;

  // Validation
  if (!type || !name || !email || !title || !description) {
    return res.status(400).json({ error: 'All fields (Name, Email, Title, and Description) are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[EchoX Serverless] RESEND_API_KEY is not configured on Vercel.');
    return res.status(500).json({ error: 'Internal mail service is not configured. Please contact support.' });
  }

  const isBug = type === 'bug';
  const typeLabel = isBug ? 'Issue Report' : 'Feature Request';

  // Build developer notification HTML template (subtle orange style)
  const devHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #ea580c; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-top: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">New ${typeLabel}</h2>
      <p style="font-size: 14px; color: #475569; margin: 16px 0;"><strong>Sender Name:</strong> ${name}</p>
      <p style="font-size: 14px; color: #475569; margin: 16px 0;"><strong>Sender Email:</strong> ${email}</p>
      <p style="font-size: 14px; color: #475569; margin: 16px 0;"><strong>Title:</strong> ${title}</p>
      
      <div style="margin: 24px 0; background-color: #f8fafc; padding: 20px; border-left: 4px solid #f97316; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${description}</p>
      </div>

      ${extra ? `
        <h4 style="margin: 24px 0 8px; font-size: 12px; text-transform: uppercase; tracking: 0.05em; color: #64748b;">Reproduce Steps / Additional Notes</h4>
        <pre style="margin: 0; background-color: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #334155; line-height: 1.5; border: 1px solid #e2e8f0;">${extra}</pre>
      ` : ''}

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">Sent automatically by EchoX Feedback Pipeline</p>
    </div>
  `;

  // Build user confirmation HTML template (subtle orange style)
  const userHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; font-size: 24px; color: #f97316; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">EchoX</span>
      </div>
      <h2 style="color: #ea580c; border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-top: 0; font-size: 18px; font-weight: 700; text-align: center;">We've Received Your Feedback!</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #334155; margin: 20px 0;">Hi ${name},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 16px 0;">Thank you for writing to us. We have received your <strong>${typeLabel.toLowerCase()}</strong> details regarding:</p>
      
      <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background-color: #f8fafc; border: 1px dashed #cbd5e1; font-style: italic; color: #475569; font-size: 13px;">
        "${title}"
      </div>
      
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 16px 0;">Our team has been notified. We review every submission carefully and will get back to you if we need further details.</p>
      <p style="font-size: 14px; color: #1e293b; margin: 28px 0 0;">Best regards,<br/><strong style="color: #ea580c;">EchoX Team</strong></p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">EchoX — Local AI Video Translation & Dubbing</p>
    </div>
  `;

  try {
    // Dispatch dev notification email and user confirmation in parallel
    const [devRes, userRes] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'EchoX Feedback <onboarding@resend.dev>',
          to: 'saipraveenamujuri@gmail.com',
          subject: `[EchoX ${typeLabel}]: ${title}`,
          html: devHtml,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'EchoX Support <onboarding@resend.dev>',
          to: email,
          subject: `EchoX: We received your ${typeLabel.toLowerCase()}`,
          html: userHtml,
        }),
      }),
    ]);

    if (!devRes.ok) {
      const devErr = await devRes.text();
      console.error('[EchoX Serverless] Resend dev notification failed:', devErr);
    }
    if (!userRes.ok) {
      const userErr = await userRes.text();
      console.error('[EchoX Serverless] Resend user confirmation failed:', userErr);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[EchoX Serverless] Exception during resend dispatch:', error);
    return res.status(500).json({ error: 'Failed to send feedback. Please try again later.' });
  }
}
