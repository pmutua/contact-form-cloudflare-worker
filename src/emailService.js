// emailService.js
/**
 * Handles sending email notifications and auto-replies.
 * Assumes `env.SEND_EMAIL` is a function binding to a Cloudflare Worker Email service or similar.
 */

export async function sendEmails(env, toEmail, subject, notifyMessage, clientReplyMessage, corsHeaders) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.MAILTRAP_TOKEN}`,
        };

        // Notification to you
        const notificationPayload = {
            from: { email: 'hello@philipmutua.xyz', name: 'Contact Form' },
            to: [{ email: 'hello@philipmutua.xyz' }],
            subject: `📬 New Contact Form Submission - ${subject}`,
            html: notifyMessage,
        };

        // Auto-reply to client
        const clientReplyPayload = {
            from: { email: 'hello@philipmutua.xyz', name: 'Philip Mutua' },
            to: [{ email: toEmail, name: 'Client' }],
            subject: `✅ Thank you for reaching out, ${toEmail}! - Re: ${subject}`,
            html: clientReplyMessage,
        };

        // Send both emails in parallel
        const [notificationRes, clientReplyRes] = await Promise.all([
            fetch('https://send.api.mailtrap.io/api/send', {
                method: 'POST',
                headers,
                body: JSON.stringify(notificationPayload),
            }),
            fetch('https://send.api.mailtrap.io/api/send', {
                method: 'POST',
                headers,
                body: JSON.stringify(clientReplyPayload),
            }),
        ]);

        // Handle failures
        if (!notificationRes.ok || !clientReplyRes.ok) {
            console.error('Notification:', await notificationRes.text());
            console.error('Client Reply:', await clientReplyRes.text());
            return new Response('Failed to send email', {
                status: 500,
                headers: corsHeaders,
            });
        }

        // Success
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Form submitted successfully and confirmation email sent!',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: 'Unexpected error' }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}
