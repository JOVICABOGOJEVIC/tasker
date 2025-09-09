import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import CompanyModel from "../../models/auth/company.js";

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
                countryCode: countryCode
            }, 
            secret, 
            {expiresIn:'24h'}
        );
        
        // Ensure we're sending back the data in the same format as signup
        const responseData = {
            result: {
                ...oldCompany._doc,
                countryCode: countryCode,
                businessType: oldCompany.businessType
            },
            token
        };
        
        console.log("Login successful. Sending response:", {
            id: responseData.result._id,
            email: responseData.result.email,
            businessType: responseData.result.businessType,
            countryCode: responseData.result.countryCode
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
            role: "owner"
        };
        
        console.log("Creating company with data:", companyData);
        const result = await CompanyModel.create(companyData);
        
        // Generate JWT token with all necessary data
        const token = jwt.sign(
            {
                email: result.email, 
                id: result._id,
                businessType: result.businessType,
                countryCode: result.countryCode
            }, 
            secret, 
            {expiresIn: "24h"}
        );
        
        console.log("Company created successfully:", {
            id: result._id,
            email: result.email,
            businessType: result.businessType,
            countryCode: result.countryCode
        });
        
        res.status(201).json({
            result: {
                ...result._doc,
                countryCode: result.countryCode,
                businessType: result.businessType
            }, 
            token
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
      role: "owner"
    });

    // Generisanje JWT tokena
    const token = jwt.sign(
      { 
        email: result.email, 
        id: result._id,
        countryCode: result.countryCode // Include country code in token
      },
      process.env.JWT_SECRET || "test",
      { expiresIn: "24h" }
    );

    res.status(201).json({ result, token });
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
        const company = await CompanyModel.findByIdAndUpdate(
            id,
            req.body,
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