import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Check Brevo SMTP connection when server starts
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ BREVO SMTP CONNECTION FAILED");
        console.log(error);
    } else {
        console.log("✅ BREVO SMTP CONNECTION SUCCESSFUL");
    }
});

const sendEmail = async ({ to, subject, body }) => {
    try {
        console.log("====================================");
        console.log("📧 SENDING EMAIL");
        console.log("To:", to);
        console.log("From:", process.env.SENDER_EMAIL);
        console.log("Subject:", subject);
        console.log("====================================");

        if (!to) {
            throw new Error("Recipient email is missing");
        }

        if (!process.env.SENDER_EMAIL) {
            throw new Error("SENDER_EMAIL is missing in .env");
        }

        const response = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to,
            subject,
            html: body,
        });

        console.log("✅ EMAIL SENT SUCCESSFULLY");
        console.log("Message ID:", response.messageId);

        return response;
    } catch (error) {
        console.log("❌ EMAIL SENDING FAILED");
        console.log("Error:", error);

        throw error;
    }
};

export default sendEmail;