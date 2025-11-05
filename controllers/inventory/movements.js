import InventoryMovementModel from '../../models/inventory/InventoryMovement.js';
import InventoryItemModel from '../../models/inventory/InventoryItem.js';

// Get all withdrawn items (povučena roba)
export const getWithdrawnItems = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { jobId, status } = req.query;
    
    const query = { companyId };
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;
    
    const movements = await InventoryMovementModel.find(query)
      .populate('itemId', 'name itemCode unit')
      .populate('jobId', 'clientName serviceDate status')
      .populate('workerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.status(200).json(movements);
  } catch (error) {
    console.error('Error fetching withdrawn items:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reserve item for job
export const reserveItemForJob = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { jobId, itemId, quantity, unitSellingPrice } = req.body;
    
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
    
    // Create or update movement
    const unitCost = item.averageCost;
    const totalCost = quantity * unitCost;
    const totalSellingPrice = quantity * (unitSellingPrice || item.sellingPrice || 0);
    const margin = totalSellingPrice - totalCost;
    const marginPercentage = totalCost > 0 ? (margin / totalCost) * 100 : 0;
    
    const movement = await InventoryMovementModel.findOneAndUpdate(
      { jobId, itemId, status: 'RESERVED' },
      {
        quantity,
        unit: item.unit,
        movementType: 'RESERVED',
        reservedDate: new Date(),
        unitCost,
        totalCost,
        unitSellingPrice: unitSellingPrice || item.sellingPrice || 0,
        totalSellingPrice,
        margin,
        marginPercentage,
        status: 'RESERVED',
        companyId,
        reservedBy: companyId,
        notes: req.body.notes
      },
      { upsert: true, new: true }
    );
    
    // Update item reserved quantity
    item.reservedQuantity = (item.reservedQuantity || 0) + quantity;
    item.availableQuantity = Math.max(0, item.currentQuantity - item.reservedQuantity);
    await item.save();
    
    res.status(201).json(movement);
  } catch (error) {
    console.error('Error reserving item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Issue reserved item (fizičko preuzimanje)
export const issueReservedItem = async (req, res) => {
  try {
    const { movementId } = req.params;
    const companyId = req.user.id;
    
    const movement = await InventoryMovementModel.findOne({ _id: movementId, companyId });
    if (!movement) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena' });
    }
    
    if (movement.status !== 'RESERVED') {
      return res.status(400).json({ message: 'Artikal nije u rezervisanom stanju' });
    }
    
    movement.issuedDate = new Date();
    movement.movementType = 'ISSUED';
    movement.status = 'ISSUED';
    movement.issuedBy = companyId;
    movement.workerId = req.body.workerId;
    movement.updatedAt = Date.now();
    await movement.save();
    
    res.status(200).json(movement);
  } catch (error) {
    console.error('Error issuing item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Return unused item
export const returnItem = async (req, res) => {
  try {
    const { movementId } = req.params;
    const companyId = req.user.id;
    const { quantity } = req.body;
    
    const movement = await InventoryMovementModel.findOne({ _id: movementId, companyId });
    if (!movement) {
      return res.status(404).json({ message: 'Rezervacija nije pronađena' });
    }
    
    const returnQuantity = quantity || movement.quantity;
    
    // Update movement
    movement.returnedDate = new Date();
    movement.movementType = 'RETURNED';
    movement.status = 'RETURNED';
    movement.quantity = movement.quantity - returnQuantity;
    movement.updatedAt = Date.now();
    await movement.save();
    
    // Update item
    const item = await InventoryItemModel.findById(movement.itemId);
    if (item) {
      item.reservedQuantity = Math.max(0, item.reservedQuantity - returnQuantity);
      item.currentQuantity = item.currentQuantity + returnQuantity;
      item.availableQuantity = Math.max(0, item.currentQuantity - item.reservedQuantity);
      item.totalValue = item.currentQuantity * item.averageCost;
      await item.save();
    }
    
    res.status(200).json(movement);
  } catch (error) {
    console.error('Error returning item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get movements by job
export const getMovementsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.user.id;
    
    const movements = await InventoryMovementModel.find({ companyId, jobId })
      .populate('itemId', 'name itemCode unit')
      .populate('workerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.status(200).json(movements);
  } catch (error) {
    console.error('Error fetching job movements:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get statistics for withdrawn items
export const getWithdrawnItemsStats = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { jobId } = req.query;
    
    const query = { companyId };
    if (jobId) query.jobId = jobId;
    
    const movements = await InventoryMovementModel.find(query);
    
    const stats = {
      totalReserved: movements.filter(m => m.status === 'RESERVED').length,
      totalIssued: movements.filter(m => m.status === 'ISSUED').length,
      totalReturned: movements.filter(m => m.status === 'RETURNED').length,
      totalCost: movements.reduce((sum, m) => sum + (m.totalCost || 0), 0),
      totalSellingPrice: movements.reduce((sum, m) => sum + (m.totalSellingPrice || 0), 0),
      totalMargin: movements.reduce((sum, m) => sum + (m.margin || 0), 0)
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching withdrawn items stats:', error);
    res.status(500).json({ message: error.message });
  }
};

