import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Create transporter for sending emails
const createTransporter = () => {
  // For development, you can use Gmail or another SMTP service
  // For production, configure with your actual SMTP credentials
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // Your email
      pass: process.env.SMTP_PASSWORD // Your email password or app password
    }
  });

  return transporter;
};

// Send verification email
export const sendVerificationEmail = async (email, verificationToken, companyName) => {
  try {
    const transporter = createTransporter();
    
    // Get the base URL from environment or use localhost for development
    const baseUrl = process.env.FRONTEND_URL || process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@spintasker.com',
      to: email,
      subject: 'Potvrda email adrese - SpinTasker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Dobrodošli u SpinTasker, ${companyName}!</h2>
          <p style="color: #666; font-size: 16px;">
            Hvala vam što ste se registovali. Da biste aktivirali svoj nalog, molimo vas da potvrdite svoju email adresu.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Potvrdi Email Adresu
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Ili kopirajte i zalepite ovaj link u vaš pretraživač:
          </p>
          <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">
            ${verificationLink}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Ako niste kreirali ovaj nalog, molimo vas da ignorišete ovaj email.
          </p>
          <p style="color: #999; font-size: 12px;">
            Ovaj link će biti važeći narednih 24 sati.
          </p>
        </div>
      `,
      text: `
        Dobrodošli u SpinTasker, ${companyName}!
        
        Hvala vam što ste se registovali. Da biste aktivirali svoj nalog, molimo vas da potvrdite svoju email adresu klikom na link ispod:
        
        ${verificationLink}
        
        Ako niste kreirali ovaj nalog, molimo vas da ignorišete ovaj email.
        
        Ovaj link će biti važeći narednih 24 sati.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email (for future use)
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const baseUrl = process.env.FRONTEND_URL || process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@spintasker.com',
      to: email,
      subject: 'Resetovanje lozinke - SpinTasker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Resetovanje lozinke</h2>
          <p style="color: #666; font-size: 16px;">
            Primili smo zahtev za resetovanje vaše lozinke. Kliknite na dugme ispod da biste resetovali lozinku.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Resetuj Lozinku
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Ili kopirajte i zalepite ovaj link u vaš pretraživač:
          </p>
          <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">
            ${resetLink}
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Ako niste zahtevali resetovanje lozinke, molimo vas da ignorišete ovaj email.
          </p>
          <p style="color: #999; font-size: 12px;">
            Ovaj link će biti važeći narednih 1 sat.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

