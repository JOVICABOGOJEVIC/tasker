import InventoryItemModel from '../../models/inventory/InventoryItem.js';
import WarehouseTransactionModel from '../../models/inventory/WarehouseTransaction.js';
import InventoryMovementModel from '../../models/inventory/InventoryMovement.js';
import CustomsDeclarationModel from '../../models/inventory/CustomsDeclaration.js';

// Get calculations and reports
export const getCalculations = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }
    
    // Inventory valuation
    const items = await InventoryItemModel.find({ companyId, isActive: true });
    const inventoryValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    
    // Transactions summary
    const transactions = await WarehouseTransactionModel.find({ 
      companyId, 
      ...dateQuery 
    });
    
    const inputs = transactions.filter(t => t.transactionType === 'INPUT');
    const outputs = transactions.filter(t => t.transactionType === 'OUTPUT');
    
    const inputValue = inputs.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    const outputValue = outputs.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    const inputQuantity = inputs.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const outputQuantity = outputs.reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    // VAT summary
    const totalVAT = transactions.reduce((sum, t) => sum + (t.vatAmount || 0), 0);
    
    // Customs summary
    const customsDeclarations = await CustomsDeclarationModel.find({ 
      companyId,
      ...dateQuery 
    });
    const totalCustomsDuty = customsDeclarations.reduce((sum, d) => sum + (d.customsDuty || 0), 0);
    const totalCustomsVAT = customsDeclarations.reduce((sum, d) => sum + (d.vatAmount || 0), 0);
    
    // Job-related movements
    const movements = await InventoryMovementModel.find({ 
      companyId,
      ...dateQuery 
    }).populate('jobId', 'clientName serviceDate');
    
    const jobMaterialsCost = movements.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const jobMaterialsRevenue = movements.reduce((sum, m) => sum + (m.totalSellingPrice || 0), 0);
    const jobMaterialsMargin = movements.reduce((sum, m) => sum + (m.margin || 0), 0);
    
    const calculations = {
      inventory: {
        totalValue: inventoryValue,
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + (item.currentQuantity || 0), 0)
      },
      transactions: {
        inputs: {
          count: inputs.length,
          quantity: inputQuantity,
          value: inputValue
        },
        outputs: {
          count: outputs.length,
          quantity: outputQuantity,
          value: outputValue
        },
        netChange: inputQuantity - outputQuantity,
        netValue: inputValue - outputValue
      },
      vat: {
        totalVAT: totalVAT,
        inputVAT: inputs.reduce((sum, t) => sum + (t.vatAmount || 0), 0),
        outputVAT: 0 // Output VAT is on invoices, not inventory
      },
      customs: {
        totalDeclarations: customsDeclarations.length,
        totalCustomsDuty: totalCustomsDuty,
        totalCustomsVAT: totalCustomsVAT,
        totalCustomsAmount: totalCustomsDuty + totalCustomsVAT
      },
      jobMaterials: {
        totalCost: jobMaterialsCost,
        totalRevenue: jobMaterialsRevenue,
        totalMargin: jobMaterialsMargin,
        marginPercentage: jobMaterialsCost > 0 ? (jobMaterialsMargin / jobMaterialsCost) * 100 : 0,
        movementsCount: movements.length
      }
    };
    
    res.status(200).json(calculations);
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ message: error.message });
  }
};

