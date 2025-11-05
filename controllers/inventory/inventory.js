import InventoryItemModel from '../../models/inventory/InventoryItem.js';
import WarehouseTransactionModel from '../../models/inventory/WarehouseTransaction.js';

// Get all inventory items for a company
export const getInventoryItems = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const items = await InventoryItemModel.find({ companyId, isActive: true })
      .sort({ name: 1 });
    
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single inventory item
export const getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const item = await InventoryItemModel.findOne({ _id: id, companyId });
    
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create inventory item
export const createInventoryItem = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    // Check if item code already exists
    const existingItem = await InventoryItemModel.findOne({
      itemCode: req.body.itemCode,
      companyId
    });
    
    if (existingItem) {
      return res.status(400).json({ message: 'Artikal sa ovom šifrom već postoji' });
    }
    
    const item = await InventoryItemModel.create({
      ...req.body,
      companyId,
      createdBy: companyId
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const item = await InventoryItemModel.findOneAndUpdate(
      { _id: id, companyId },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    res.status(200).json(item);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete inventory item (soft delete)
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.id;
    
    const item = await InventoryItemModel.findOneAndUpdate(
      { _id: id, companyId },
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ message: 'Artikal nije pronađen' });
    }
    
    res.status(200).json({ message: 'Artikal je obrisan' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get inventory statistics
export const getInventoryStats = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const items = await InventoryItemModel.find({ companyId, isActive: true });
    
    const stats = {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + (item.totalValue || 0), 0),
      totalQuantity: items.reduce((sum, item) => sum + (item.currentQuantity || 0), 0),
      lowStockItems: items.filter(item => 
        item.currentQuantity <= item.minQuantity && item.minQuantity > 0
      ).length,
      reservedQuantity: items.reduce((sum, item) => sum + (item.reservedQuantity || 0), 0),
      availableQuantity: items.reduce((sum, item) => sum + (item.availableQuantity || 0), 0)
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ message: error.message });
  }
};

