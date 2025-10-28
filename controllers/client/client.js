import ClientModal from "../../models/client.js";

export const createClient = async (req, res) => {
  try {
    // Get companyId from JWT token
    const companyId = req.userId;
    if (!companyId) {
      console.log('Auth error: No company ID in token');
      return res.status(401).json({ message: 'Company ID not found in token' });
    }

    console.log('Received client data:', req.body);
    
    // No validation - all fields are optional except name and phone
    // Only check if name and phone exist (basic requirement)
    const { name, phone } = req.body;
    
    if (!name?.trim()) {
      console.log('Validation error: Name is required');
      return res.status(400).json({ 
        message: 'Name is required' 
      });
    }
    
    if (!phone?.trim()) {
      console.log('Validation error: Phone is required');
      return res.status(400).json({ 
        message: 'Phone is required' 
      });
    }

    console.log('Creating client with data:', { ...req.body, companyId });
    const client = await ClientModal.create({
      ...req.body,
      companyId
    });
    console.log('Client created successfully:', client);
    res.status(201).json(client);
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.log('Mongoose validation error:', validationErrors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
    }
    
    // Handle other errors
    console.error('Error creating client:', error);
    res.status(500).json({ 
      message: 'An error occurred while creating the client',
      error: error.message
    });
  }
};

export const getClients = async (req, res) => {
  try {
    // Get companyId from JWT token
    const companyId = req.userId;
    if (!companyId) {
      console.log('Auth error: No company ID in token');
      return res.status(401).json({ message: 'Company ID not found in token' });
    }

    console.log('Fetching clients for company:', companyId);
    // Find only clients belonging to the company
    const clients = await ClientModal.find({ companyId });
    console.log(`Found ${clients.length} clients`);
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: error.message,
      error: error.stack 
    });
  }
};

export const getClient = async (req, res) => {
  try {
    // Get companyId from JWT token
    const companyId = req.userId;
    if (!companyId) {
      return res.status(401).json({ message: 'Company ID not found in token' });
    }

    // Find the client and verify it belongs to the company
    const client = await ClientModal.findOne({
      _id: req.params.id,
      companyId
    });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateClient = async (req, res) => {
  try {
    // Get companyId from JWT token
    const companyId = req.userId;
    if (!companyId) {
      return res.status(401).json({ message: 'Company ID not found in token' });
    }

    // No validation - all fields are optional
    // Find and update the client, ensuring it belongs to the company
    const client = await ClientModal.findOneAndUpdate(
      { 
        _id: req.params.id,
        companyId 
      },
      { 
        ...req.body,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: false 
      }
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json(client);
  } catch (error) {
    // Handle other errors
    console.error('Error updating client:', error);
    res.status(500).json({ 
      message: 'An error occurred while updating the client',
      error: error.message
    });
  }
};

export const deleteClient = async (req, res) => {
  try {
    // Get companyId from JWT token
    const companyId = req.userId;
    if (!companyId) {
      return res.status(401).json({ message: 'Company ID not found in token' });
    }

    // Find and delete the client, ensuring it belongs to the company
    const client = await ClientModal.findOneAndDelete({
      _id: req.params.id,
      companyId
    });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 