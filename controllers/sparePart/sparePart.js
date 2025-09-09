import SparePart from "../../models/sparePart.js";
import mongoose from "mongoose";

export const createSparePart = async (req, res) => {
  try {
    console.log('=== Starting spare part creation ===');
    console.log('Request headers:', req.headers);
    console.log('Request user:', { userId: req.userId, userEmail: req.userEmail });
    console.log('Received spare part data:', req.body);
    
    if (!req.userEmail) {
      console.error('No user email found in request');
      return res.status(401).json({ message: 'Korisnik nije autentifikovan' });
    }

    // Validate required fields
    const requiredFields = ['name', 'code', 'price', 'purchasePrice', 'tax', 'quantity', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: `Nedostaju obavezna polja: ${missingFields.join(', ')}` 
      });
    }

    // Validate numeric fields
    const numericFields = ['price', 'purchasePrice', 'tax', 'quantity'];
    const invalidFields = numericFields.filter(field => isNaN(parseFloat(req.body[field])));
    
    if (invalidFields.length > 0) {
      console.error('Invalid numeric fields:', invalidFields);
      return res.status(400).json({ 
        message: `Neispravne numeričke vrednosti za polja: ${invalidFields.join(', ')}` 
      });
    }

    const sparePartData = {
      ...req.body,
      price: parseFloat(req.body.price),
      purchasePrice: parseFloat(req.body.purchasePrice),
      tax: parseFloat(req.body.tax),
      quantity: parseInt(req.body.quantity),
      userEmail: req.userEmail
    };

    console.log('Prepared spare part data:', sparePartData);

    const sparePart = await SparePart.create(sparePartData);
    
    console.log('Successfully created spare part:', sparePart);
    res.status(201).json(sparePart);
  } catch (error) {
    console.error('Error creating spare part:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      details: error.errors
    });
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Šifra rezervnog dela već postoji' 
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Greška pri validaciji',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Greška pri čuvanju rezervnog dela',
      error: error.message,
      details: error.errors || error.toString()
    });
  }
};

export const getSpareParts = async (req, res) => {
  try {
    console.log('Fetching spare parts for user:', req.userEmail);
    console.log('Fetching spare parts...');
    console.log('Current MongoDB connection state:', mongoose.connection.readyState);
    console.log('Current database:', mongoose.connection.db.databaseName);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    console.log('Using model:', SparePart.modelName);
    console.log('Model collection:', SparePart.collection.name);
    
    const spareParts = await SparePart.find({ userEmail: req.userEmail });
    console.log(`Found ${spareParts.length} spare parts for user ${req.userEmail}`);
    
    // Count documents in collection directly
    const count = await mongoose.connection.db.collection('spareparts').countDocuments();
    console.log('Total documents in spareparts collection:', count);
    
    res.status(200).json(spareParts);
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getSparePart = async (req, res) => {
  try {
    const sparePart = await SparePart.findOne({
      _id: req.params.id,
      userEmail: req.userEmail
    });
    
    if (!sparePart) {
      return res.status(404).json({ message: "Rezervni deo nije pronađen" });
    }
    
    res.status(200).json(sparePart);
  } catch (error) {
    console.error('Error fetching spare part:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateSparePart = async (req, res) => {
  try {
    // Prvo proverimo da li deo pripada ulogovanom korisniku
    const existingSparePart = await SparePart.findOne({
      _id: req.params.id,
      userEmail: req.userEmail
    });

    if (!existingSparePart) {
      return res.status(404).json({ message: "Rezervni deo nije pronađen" });
    }

    const sparePart = await SparePart.findByIdAndUpdate(
      req.params.id,
      { ...req.body, userEmail: req.userEmail },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(sparePart);
  } catch (error) {
    console.error('Error updating spare part:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Šifra rezervnog dela već postoji' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteSparePart = async (req, res) => {
  try {
    // Prvo proverimo da li deo pripada ulogovanom korisniku
    const sparePart = await SparePart.findOneAndDelete({
      _id: req.params.id,
      userEmail: req.userEmail
    });
    
    if (!sparePart) {
      return res.status(404).json({ message: "Rezervni deo nije pronađen" });
    }
    
    res.status(200).json({ message: "Rezervni deo uspešno obrisan" });
  } catch (error) {
    console.error('Error deleting spare part:', error);
    res.status(500).json({ message: error.message });
  }
}; 