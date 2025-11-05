import WarehouseTransactionModel from '../../models/inventory/WarehouseTransaction.js';
import InventoryItemModel from '../../models/inventory/InventoryItem.js';
import InventoryMovementModel from '../../models/inventory/InventoryMovement.js';

// Get all warehouse transactions
export const getWarehouseTransactions = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { type, startDate, endDate } = req.query;
    
    const query = { companyId };
    if (type) query.transactionType = type;
    if (startDate || endDate) {
      query.documentDate = {};
      if (startDate) query.documentDate.$gte = new Date(startDate);
      if (endDate) query.documentDate.$lte = new Date(endDate);
    }
    
    const transactions = await WarehouseTransactionModel.find(query)
      .populate('itemId', 'name itemCode unit')
      .populate('jobId', 'clientName serviceDate')
      .sort({ documentDate: -1, createdAt: -1 });
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching warehouse transactions:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create warehouse transaction (INPUT)
export const createInputTransaction = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { itemId, quantity, unitPrice, documentNumber, documentDate, ...rest } = req.body;
    
    // Find item
    const item = await InventoryItemModel.findOne({ _id: itemId, companyId });
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    // Calculate values
    const totalValue = quantity * unitPrice;
    const vatAmount = rest.vatRate ? (totalValue * rest.vatRate / 100) : 0;
    
    // Update average cost (moving average method)
    const newTotalQuantity = item.currentQuantity + quantity;
    const newTotalValue = (item.currentQuantity * item.averageCost) + totalValue;
    const newAverageCost = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : unitPrice;
    
    // Create transaction
    const transaction = await WarehouseTransactionModel.create({
      transactionType: 'INPUT',
      documentType: 'RECEIPT',
      itemId,
      quantity,
      unit: item.unit,
      unitPrice,
      totalValue,
      vatAmount,
      vatRate: rest.vatRate || item.vatRate || 0,
      customsAmount: rest.customsAmount || 0,
      customsRate: rest.customsRate || 0,
      landedCost: rest.landedCost || 0,
      documentNumber,
      documentDate: new Date(documentDate),
      companyId,
      createdBy: companyId,
      partnerId: rest.partnerId,
      partnerName: rest.partnerName,
      customsDeclarationId: rest.customsDeclarationId,
      notes: rest.notes,
      ...rest
    });
    
    // Update inventory item
    item.currentQuantity = newTotalQuantity;
    item.averageCost = newAverageCost;
    item.availableQuantity = Math.max(0, newTotalQuantity - item.reservedQuantity);
    item.totalValue = newTotalQuantity * newAverageCost;
    await item.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating input transaction:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create warehouse transaction (OUTPUT)
export const createOutputTransaction = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { itemId, quantity, documentNumber, documentDate, jobId, reason, ...rest } = req.body;
    
    // Find item
    const item = await InventoryItemModel.findOne({ _id: itemId, companyId });
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    // Check available quantity
    if (item.availableQuantity < quantity) {
      return res.status(400).json({ 
        message: `Nedovoljna zaliha. Dostupno: ${item.availableQuantity}, Traženo: ${quantity}` 
      });
    }
    
    // Use average cost for output
    const unitPrice = item.averageCost;
    const totalValue = quantity * unitPrice;
    
    // Create transaction
    const transaction = await WarehouseTransactionModel.create({
      transactionType: 'OUTPUT',
      documentType: 'ISSUE',
      itemId,
      quantity,
      unit: item.unit,
      unitPrice,
      totalValue,
      vatAmount: 0, // Output doesn't have VAT in inventory (it's on invoice)
      vatRate: item.vatRate || 0,
      documentNumber,
      documentDate: new Date(documentDate),
      companyId,
      createdBy: companyId,
      jobId,
      reason: reason || 'Izdavanje iz magacina',
      partnerId: rest.partnerId,
      partnerName: rest.partnerName,
      notes: rest.notes,
      ...rest
    });
    
    // Update inventory item
    item.currentQuantity = Math.max(0, item.currentQuantity - quantity);
    item.reservedQuantity = Math.max(0, item.reservedQuantity - (rest.wasReserved ? quantity : 0));
    item.availableQuantity = Math.max(0, item.currentQuantity - item.reservedQuantity);
    item.totalValue = item.currentQuantity * item.averageCost;
    await item.save();
    
    // If connected to job, create or update inventory movement
    if (jobId) {
      await InventoryMovementModel.findOneAndUpdate(
        { jobId, itemId, status: 'RESERVED' },
        {
          quantity,
          issuedDate: new Date(),
          unitCost: unitPrice,
          totalCost: totalValue,
          status: 'ISSUED',
          issuedBy: companyId,
          updatedAt: Date.now()
        },
        { upsert: true, new: true }
      );
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating output transaction:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create return transaction
export const createReturnTransaction = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { itemId, quantity, documentNumber, documentDate, jobId, returnType, ...rest } = req.body;
    
    // Find item
    const item = await InventoryItemModel.findOne({ _id: itemId, companyId });
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    const unitPrice = item.averageCost;
    const totalValue = quantity * unitPrice;
    
    // Determine transaction type
    const transactionType = returnType === 'FROM_CUSTOMER' ? 'RETURN_IN' : 'RETURN_OUT';
    const documentType = returnType === 'FROM_CUSTOMER' ? 'RETURN' : 'RETURN';
    
    // Create transaction
    const transaction = await WarehouseTransactionModel.create({
      transactionType,
      documentType,
      itemId,
      quantity,
      unit: item.unit,
      unitPrice,
      totalValue,
      documentNumber,
      documentDate: new Date(documentDate),
      companyId,
      createdBy: companyId,
      jobId,
      reason: rest.reason || 'Povrat robe',
      notes: rest.notes,
      ...rest
    });
    
    // Update inventory (only for RETURN_IN - customer return)
    if (returnType === 'FROM_CUSTOMER') {
      const newQuantity = item.currentQuantity + quantity;
      const newTotalValue = (item.currentQuantity * item.averageCost) + totalValue;
      const newAverageCost = newQuantity > 0 ? newTotalValue / newQuantity : unitPrice;
      
      item.currentQuantity = newQuantity;
      item.averageCost = newAverageCost;
      item.availableQuantity = Math.max(0, newQuantity - item.reservedQuantity);
      item.totalValue = newQuantity * newAverageCost;
      await item.save();
      
      // Update inventory movement if connected to job
      if (jobId) {
        await InventoryMovementModel.findOneAndUpdate(
          { jobId, itemId },
          {
            returnedDate: new Date(),
            status: 'RETURNED',
            updatedAt: Date.now()
          }
        );
      }
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating return transaction:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get transactions by job
export const getTransactionsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.user.id;
    
    const transactions = await WarehouseTransactionModel.find({
      companyId,
      jobId
    })
      .populate('itemId', 'name itemCode unit')
      .sort({ createdAt: -1 });
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching job transactions:', error);
    res.status(500).json({ message: error.message });
  }
};

