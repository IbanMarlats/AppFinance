import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config(); // Ensure env vars are loaded

let transporter;
const PORT = process.env.PORT || 3001;
// Frontend URL is usually on 5173 for Vite dev
const CLIENT_URL = 'http://localhost:5173';

export async function createTransporter() {
    if (!transporter) {
        // 1. Try Environment Variables (Real Email)
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log("Configuring authentic SMTP transporter...");
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log(`SMTP configured with host: ${process.env.SMTP_HOST}`);
        }
        // 2. Fallback to Ethereal (Development / Test)
        else {
            try {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: testAccount.user, // generated ethereal user
                        pass: testAccount.pass, // generated ethereal password
                    },
                });
                console.log("----------------------------------------------------------------");
                console.log(" [DEV MODE] Email Transporter using Ethereal (Mock Server)");
                console.log(" User: " + testAccount.user);
                console.log("----------------------------------------------------------------");
            } catch (e) {
                console.error("Failed to create Ethereal account, falling back to console log");
                transporter = null;
            }
        }
    }
    return transporter;
}

export async function sendVerificationEmail(email, token) {
    // Ensure transporter is ready
    if (!transporter) await createTransporter();

    const link = `http://localhost:${PORT}/api/auth/verify/${token}`;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Finance App" <noreply@financeapp.local>',
        to: email,
        subject: "Vérifiez votre email",
        html: `<h1>Bienvenue !</h1><p>Merci de confirmer votre inscription en cliquant sur ce lien :</p><a href="${link}">${link}</a>`,
    };

    if (transporter) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Message sent: %s", info.messageId);
            if (info.messageId && !process.env.SMTP_HOST) {
                console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            }
        } catch (error) {
            console.error("Error sending email: ", error);
        }
    } else {
        console.log("----------------------------------------------------------------");
        console.log(" >>> VERIFICATION LINK: " + link);
        console.log("----------------------------------------------------------------");
    }
}

export async function sendPasswordResetEmail(email, token) {
    // Ensure transporter is ready
    if (!transporter) await createTransporter();

    const link = `${CLIENT_URL}/reset-password?token=${token}`;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Finance App" <noreply@financeapp.local>',
        to: email,
        subject: "Réinitialisation de votre mot de passe",
        html: `
            <h1>Réinitialisation de mot de passe</h1>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
            <a href="${link}">${link}</a>
            <p>Ce lien est valide pour 1 heure.</p>
            <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
        `,
    };

    if (transporter) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Reset Password Message sent: %s", info.messageId);
            if (info.messageId && !process.env.SMTP_HOST) {
                console.log("Reset Preview URL: %s", nodemailer.getTestMessageUrl(info));
            }
        } catch (error) {
            console.error("Error sending reset email: ", error);
        }
    } else {
        console.log("----------------------------------------------------------------");
        console.log(" >>> RESET PASSWORD LINK: " + link);
        console.log("----------------------------------------------------------------");
    }
}

export function getTransporter() {
    return transporter;
}
