import CustomsDeclarationModel from '../../models/inventory/CustomsDeclaration.js';

// Get all customs declarations
export const getCustomsDeclarations = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const declarations = await CustomsDeclarationModel.find({ companyId })
      .sort({ declarationDate: -1 });
    
    res.status(200).json(declarations);
  } catch (error) {
    console.error('Error fetching customs declarations:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single customs declaration
export const getCustomsDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const declaration = await CustomsDeclarationModel.findOne({ _id: id, companyId });
    
    if (!declaration) {
      return res.status(404).json({ message: 'Carinska deklaracija nije pronađena' });
    }
    
    res.status(200).json(declaration);
  } catch (error) {
    console.error('Error fetching customs declaration:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create customs declaration
export const createCustomsDeclaration = async (req, res) => {
  try {
    const companyId = req.user.id;
    const {
      declarationNumber,
      declarationDate,
      totalInvoiceValue,
      currency,
      exchangeRate,
      freightCost,
      insuranceCost,
      otherCosts,
      customsDutyRate,
      vatRate,
      ...rest
    } = req.body;
    
    // Calculate landed cost
    const totalLandedCost = totalInvoiceValue + (freightCost || 0) + (insuranceCost || 0) + (otherCosts || 0);
    
    // Calculate customs basis (invoice value + costs to border)
    const customsBasis = totalLandedCost * (exchangeRate || 1);
    
    // Calculate customs duty
    const customsDuty = customsBasis * (customsDutyRate || 0) / 100;
    
    // Calculate VAT basis (invoice + customs + costs)
    const vatBasis = customsBasis + customsDuty;
    
    // Calculate VAT
    const vatAmount = vatBasis * (vatRate || 0) / 100;
    
    // Calculate total amount
    const totalAmount = customsDuty + vatAmount;
    
    const declaration = await CustomsDeclarationModel.create({
      declarationNumber,
      declarationDate: new Date(declarationDate),
      totalInvoiceValue,
      currency: currency || 'EUR',
      exchangeRate: exchangeRate || 1,
      freightCost: freightCost || 0,
      insuranceCost: insuranceCost || 0,
      otherCosts: otherCosts || 0,
      totalLandedCost,
      customsBasis,
      customsDuty,
      customsDutyRate: customsDutyRate || 0,
      vatBasis,
      vatAmount,
      vatRate: vatRate || 0,
      totalAmount,
      companyId,
      createdBy: companyId,
      ...rest
    });
    
    res.status(201).json(declaration);
  } catch (error) {
    console.error('Error creating customs declaration:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update customs declaration
export const updateCustomsDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const existing = await CustomsDeclarationModel.findOne({ _id: id, companyId });
    if (!existing) {
      return res.status(404).json({ message: 'Carinska deklaracija nije pronađena' });
    }
    
    // Recalculate if relevant fields changed
    const {
      totalInvoiceValue = existing.totalInvoiceValue,
      exchangeRate = existing.exchangeRate,
      freightCost = existing.freightCost,
      insuranceCost = existing.insuranceCost,
      otherCosts = existing.otherCosts,
      customsDutyRate = existing.customsDutyRate,
      vatRate = existing.vatRate,
      ...rest
    } = req.body;
    
    const totalLandedCost = totalInvoiceValue + freightCost + insuranceCost + otherCosts;
    const customsBasis = totalLandedCost * exchangeRate;
    const customsDuty = customsBasis * customsDutyRate / 100;
    const vatBasis = customsBasis + customsDuty;
    const vatAmount = vatBasis * vatRate / 100;
    const totalAmount = customsDuty + vatAmount;
    
    const declaration = await CustomsDeclarationModel.findOneAndUpdate(
      { _id: id, companyId },
      {
        totalInvoiceValue,
        exchangeRate,
        freightCost,
        insuranceCost,
        otherCosts,
        totalLandedCost,
        customsBasis,
        customsDuty,
        customsDutyRate,
        vatBasis,
        vatAmount,
        vatRate,
        totalAmount,
        updatedAt: Date.now(),
        ...rest
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(declaration);
  } catch (error) {
    console.error('Error updating customs declaration:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete customs declaration
export const deleteCustomsDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const declaration = await CustomsDeclarationModel.findOneAndDelete({ _id: id, companyId });
    
    if (!declaration) {
      return res.status(404).json({ message: 'Carinska deklaracija nije pronađena' });
    }
    
    res.status(200).json({ message: 'Carinska deklaracija je obrisana' });
  } catch (error) {
    console.error('Error deleting customs declaration:', error);
    res.status(500).json({ message: error.message });
  }
};

