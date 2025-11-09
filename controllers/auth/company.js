import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import CompanyModel from "../../models/auth/company.js";
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/emailService.js';

const secret = "test";

// Phone prefixes mapping
const COUNTRY_PREFIXES = {
  '381': 'rs', // Serbia
  '387': 'ba', // Bosnia and Herzegovina
  '385': 'hr', // Croatia
  '382': 'me', // Montenegro
  '389': 'mk', // North Macedonia
  '386': 'si'  // Slovenia
};

const getCountryCodeFromPhone = (phone) => {
  if (!phone) return 'rs';
  // Remove the '+' if present and get the prefix
  const numberOnly = phone.replace(/^\+/, '');
  for (const [prefix, code] of Object.entries(COUNTRY_PREFIXES)) {
    if (numberOnly.startsWith(prefix)) {
      return code;
    }
  }
  return 'rs'; // Default to Serbia if no match found
};

export const signinCompany = async(req,res)=>{
    console.log("Received signin request with body:", req.body);
    const {email, password} = req.body;
    
    if (!email || !password) {
        console.log("Missing email or password");
        return res.status(400).json({message:"Email and password are required"});
    }
    
    try{
        console.log("Looking for company with email:", email);
        const oldCompany = await CompanyModel.findOne({email});
        if(!oldCompany){
            console.log("Company not found with email:", email);
            return res.status(400).json({message:"User does not exist"});
        }

        // Check if company has a valid password
        if(!oldCompany.password || oldCompany.password.trim() === ''){
            console.log("Company exists but has no password:", email);
            return res.status(400).json({message:"Account is not properly set up. Please contact support or recreate the account."});
        }

        console.log("Company found:", {
            id: oldCompany._id,
            email: oldCompany.email,
            phone: oldCompany.phone,
            countryCode: oldCompany.countryCode
        });
        
        console.log("Company found, checking password");
        const isPasswordCorect = await bcrypt.compare(password, oldCompany.password)
        if(!isPasswordCorect) {
            console.log("Invalid password for company:", email);
            return res.status(400).json({message:'Invalid credentials'});
        }

        // If email verification was previously required, auto-mark as verified
        if (!oldCompany.isEmailVerified) {
            console.log("Auto-verifying email for company:", email);
            oldCompany.isEmailVerified = true;
            oldCompany.emailVerificationToken = undefined;
            oldCompany.emailVerificationTokenExpiry = undefined;
            await oldCompany.save();
        }
        
        // Get country code from phone number
        console.log("Getting country code from phone:", oldCompany.phone);
        const countryCode = getCountryCodeFromPhone(oldCompany.phone);
        console.log("Detected country code:", countryCode);
        
        // Update company with correct country code if needed
        if (oldCompany.countryCode !== countryCode) {
            console.log("Updating company country code from", oldCompany.countryCode, "to", countryCode);
            await CompanyModel.findByIdAndUpdate(oldCompany._id, { countryCode });
            oldCompany.countryCode = countryCode;
        }
        
        console.log("Creating token with country code:", countryCode);
        const token = jwt.sign(
            {
                email: oldCompany.email, 
                id: oldCompany._id,
                businessType: oldCompany.businessType,
                countryCode: countryCode,
                role: oldCompany.role || 'owner'
            }, 
            secret, 
            {expiresIn:'24h'}
        );
        
        // Ensure we're sending back the data in the same format as signup
        const responseData = {
            result: {
                ...oldCompany._doc,
                countryCode: countryCode,
                businessType: oldCompany.businessType,
                role: oldCompany.role || 'owner'
            },
            token
        };
        
        console.log("Login successful. Sending response:", {
            id: responseData.result._id,
            email: responseData.result.email,
            businessType: responseData.result.businessType,
            countryCode: responseData.result.countryCode,
            role: responseData.result.role
        });
        
        res.status(200).json(responseData);
    } catch(error) {
        console.error("Login error:", error);
        res.status(500).json({message:'Something went wrong'});
    }
}

export const signupCompany = async(req,res) =>{
    const { 
        email, 
        password, 
        ownerName, 
        companyName, 
        city, 
        phone, 
        address, 
        businessType
    } = req.body;
    
    console.log("Received signup data:", req.body);
    
    try{
        const oldCompany = await CompanyModel.findOne({email});
        if(oldCompany){
            console.log("Email already exists:", email);
            return res.status(400).json({message:"Email already exists"});
        }
        
        // Check for required base fields
        if (!email || !password || !ownerName || !companyName || !city || !phone || !businessType || !address) {
            const missingFields = [];
            if (!email) missingFields.push('email');
            if (!password) missingFields.push('password');
            if (!ownerName) missingFields.push('ownerName');
            if (!companyName) missingFields.push('companyName');
            if (!city) missingFields.push('city');
            if (!phone) missingFields.push('phone');
            if (!businessType) missingFields.push('businessType');
            if (!address) missingFields.push('address');
            
            console.log("Missing required base fields:", missingFields);
            return res.status(400).json({message:"Missing required fields", fields: missingFields});
        }

        // Extract country code from phone number
        console.log("Extracting country code from phone:", phone);
        const countryCode = getCountryCodeFromPhone(phone);
        console.log("Detected country code:", countryCode);
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Prepare company data with required fields
        const companyData = {
            email,
            password: hashedPassword,
            ownerName,
            companyName, 
            city,
            phone,
            countryCode,
            address,
            businessType,
            role: "owner",
            isEmailVerified: true,
        };
        
        console.log("Creating company with data:", companyData);
        const result = await CompanyModel.create(companyData);
        
        console.log("Company created successfully:", {
            id: result._id,
            email: result.email,
            businessType: result.businessType,
            countryCode: result.countryCode,
            emailVerified: result.isEmailVerified
        });
        
        res.status(201).json({
            result: {
                ...result._doc,
                countryCode: result.countryCode,
                businessType: result.businessType,
                isEmailVerified: result.isEmailVerified
            },
            message: 'Registration successful. Možeš odmah da koristiš aplikaciju.',
            requiresVerification: false
        });
    } catch(error) {
        console.error("Registration error:", error);
        res.status(500).json({message:'Something went wrong'});
    }
};

export const registerCompany = async (req, res) => {
  try {
    const { 
      ownerName,
      email,
      password,
      companyName,
      phone,
      city,
      address,
      businessType
    } = req.body;

    // Extract country code from phone number
    const countryCode = getCountryCodeFromPhone(phone);

    // Provera da li kompanija već postoji
    const existingCompany = await CompanyModel.findOne({ email });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already exists" });
    }

    // Hashovanje lozinke
    const hashedPassword = await bcrypt.hash(password, 12);

    // Kreiranje nove kompanije
    const result = await CompanyModel.create({
      ownerName,
      email,
      password: hashedPassword,
      companyName,
      phone,
      countryCode,
      city,
      address,
      businessType,
      role: "owner",
      isEmailVerified: true,
    });

    // Generisanje JWT tokena
    const token = jwt.sign(
      { 
        email: result.email, 
        id: result._id,
        countryCode: result.countryCode,
        businessType: result.businessType,
        role: result.role || 'owner'
      },
      process.env.JWT_SECRET || "test",
      { expiresIn: "24h" }
    );

    res.status(201).json({ 
      result, 
      token,
      message: 'Registration successful. Možeš odmah da koristiš aplikaciju.',
      requiresVerification: false
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// CRUD functions
export const createCompany = async (req, res) => {
    try {
        const company = await CompanyModel.create(req.body);
        res.status(201).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCompanies = async (req, res) => {
    try {
        const companies = await CompanyModel.find();
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await CompanyModel.findById(id);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const updates = {
            ...req.body,
            lastUpdated: now,
            updatedAt: now
        };
        const company = await CompanyModel.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        );
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await CompanyModel.findByIdAndDelete(id);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        res.status(200).json({ message: "Company deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Email verification endpoint
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ message: "Verification token is required" });
        }
        
        // Find company with this verification token
        const company = await CompanyModel.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpiry: { $gt: new Date() } // Token must not be expired
        });
        
        if (!company) {
            return res.status(400).json({ 
                message: "Invalid or expired verification token" 
            });
        }
        
        // Check if already verified
        if (company.isEmailVerified) {
            return res.status(400).json({ 
                message: "Email is already verified" 
            });
        }
        
        // Verify the email
        company.isEmailVerified = true;
        company.emailVerificationToken = undefined;
        company.emailVerificationTokenExpiry = undefined;
        await company.save();
        
        console.log("Email verified successfully for company:", company.email);
        
        res.status(200).json({ 
            message: "Email verified successfully",
            email: company.email,
            companyName: company.companyName
        });
    } catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({ message: "Something went wrong during email verification" });
    }
};

// Resend verification email endpoint
export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        
        // Find company
        const company = await CompanyModel.findOne({ email });
        
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        
        // Check if already verified
        if (company.isEmailVerified) {
            return res.status(400).json({ 
                message: "Email is already verified" 
            });
        }
        
        // Generate new verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenExpiry = new Date();
        emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24);
        
        // Update company with new token
        company.emailVerificationToken = emailVerificationToken;
        company.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
        await company.save();
        
        // Send verification email
        const emailResult = await sendVerificationEmail(
            company.email,
            emailVerificationToken,
            company.companyName
        );
        
        if (!emailResult.success) {
            console.error("Failed to send verification email:", emailResult.error);
            return res.status(500).json({ 
                message: "Failed to send verification email. Please try again later." 
            });
        }
        
        console.log("Verification email resent successfully for:", company.email);
        
        res.status(200).json({ 
            message: "Verification email sent successfully. Please check your email." 
        });
    } catch (error) {
        console.error("Resend verification email error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

// Forgot password - zahtev za resetovanje lozinke
export const forgotPassword = async (req, res) => {
    console.log("🔐 Forgot Password Request Received");
    console.log("  Request body:", req.body);
    
    try {
        const { email } = req.body;
        
        console.log("  Email from request:", email);
        
        if (!email) {
            console.log("  ❌ Email missing");
            return res.status(400).json({ message: "Email adresa je obavezna" });
        }
        
        // Pronađi kompaniju po emailu
        console.log("  🔍 Searching for company with email:", email);
        const company = await CompanyModel.findOne({ email });
        
        // Uvek vraćamo uspešan odgovor zbog sigurnosti (ne otkrivamo da li email postoji)
        if (!company) {
            console.log("  ⚠️ Company not found for email:", email);
            console.log("  📧 Returning generic success message (security)");
            return res.status(200).json({ 
                message: "Ako email postoji, verifikacioni link je poslat na vašu email adresu." 
            });
        }
        
        console.log("  ✅ Company found:", {
            id: company._id,
            email: company.email,
            isEmailVerified: company.isEmailVerified,
            companyName: company.companyName
        });
        
        // Proveri da li je email verifikovan
        if (!company.isEmailVerified) {
            console.log("  ⚠️ Email not verified for company:", company.email);
            return res.status(400).json({ 
                message: "Email adresa nije verifikovana. Molimo vas da prvo verifikujete email adresu." 
            });
        }
        
        console.log("  ✅ Email is verified, proceeding with password reset");
        
        // Generiši reset token
        const passwordResetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetTokenExpiry = new Date();
        passwordResetTokenExpiry.setHours(passwordResetTokenExpiry.getHours() + 1); // Token važi 1 sat
        
        // Sačuvaj token u bazi
        company.passwordResetToken = passwordResetToken;
        company.passwordResetTokenExpiry = passwordResetTokenExpiry;
        await company.save();
        
        // Pošalji email sa reset linkom
        console.log("Attempting to send password reset email to:", company.email);
        console.log("Reset token generated:", passwordResetToken.substring(0, 10) + "...");
        
        try {
            const emailResult = await sendPasswordResetEmail(
                company.email,
                passwordResetToken
            );
            
            console.log("Email send result:", emailResult);
            
            if (!emailResult.success) {
                console.error("❌ Failed to send password reset email:", emailResult.error);
                console.error("Full error details:", JSON.stringify(emailResult, null, 2));
                return res.status(500).json({ 
                    message: "Greška pri slanju emaila. Molimo pokušajte ponovo kasnije.",
                    error: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
                });
            }
            
            console.log("✅ Password reset email sent successfully to:", company.email);
            console.log("Email message ID:", emailResult.messageId);
        } catch (emailError) {
            console.error("❌ Exception sending password reset email:", emailError);
            console.error("Error stack:", emailError.stack);
            return res.status(500).json({ 
                message: "Greška pri slanju emaila. Molimo pokušajte ponovo kasnije.",
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }
        
        res.status(200).json({ 
            message: "Ako email postoji, verifikacioni link je poslat na vašu email adresu." 
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Došlo je do greške. Molimo pokušajte ponovo." });
    }
};

// Reset password - resetovanje lozinke sa tokenom
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({ 
                message: "Token i nova lozinka su obavezni" 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                message: "Lozinka mora imati najmanje 6 karaktera" 
            });
        }
        
        // Pronađi kompaniju sa validnim reset tokenom
        const company = await CompanyModel.findOne({
            passwordResetToken: token,
            passwordResetTokenExpiry: { $gt: new Date() } // Token mora biti važeći
        });
        
        if (!company) {
            return res.status(400).json({ 
                message: "Nevažeći ili istekao token za resetovanje lozinke" 
            });
        }
        
        // Hashuj novu lozinku
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Ažuriraj lozinku i obriši reset token
        company.password = hashedPassword;
        company.passwordResetToken = undefined;
        company.passwordResetTokenExpiry = undefined;
        await company.save();
        
        console.log("Password reset successfully for company:", company.email);
        
        res.status(200).json({ 
            message: "Lozinka je uspešno resetovana. Možete se prijaviti sa novom lozinkom.",
            email: company.email
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Došlo je do greške pri resetovanju lozinke." });
    }
};