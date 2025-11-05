import express from 'express';
import { auth } from '../../middleware/auth.js';
import * as inventoryController from '../../controllers/inventory/inventory.js';
import * as warehouseController from '../../controllers/inventory/warehouse.js';
import * as customsController from '../../controllers/inventory/customs.js';
import * as movementsController from '../../controllers/inventory/movements.js';
import * as calculationsController from '../../controllers/inventory/calculations.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Inventory Items routes
router.get('/items', inventoryController.getInventoryItems);
router.get('/items/stats', inventoryController.getInventoryStats);
router.get('/items/:id', inventoryController.getInventoryItem);
router.post('/items', inventoryController.createInventoryItem);
router.put('/items/:id', inventoryController.updateInventoryItem);
router.delete('/items/:id', inventoryController.deleteInventoryItem);

// Warehouse Transactions routes
router.get('/transactions', warehouseController.getWarehouseTransactions);
router.get('/transactions/job/:jobId', warehouseController.getTransactionsByJob);
router.post('/transactions/input', warehouseController.createInputTransaction);
router.post('/transactions/output', warehouseController.createOutputTransaction);
router.post('/transactions/return', warehouseController.createReturnTransaction);

// Customs Declarations routes
router.get('/customs', customsController.getCustomsDeclarations);
router.get('/customs/:id', customsController.getCustomsDeclaration);
router.post('/customs', customsController.createCustomsDeclaration);
router.put('/customs/:id', customsController.updateCustomsDeclaration);
router.delete('/customs/:id', customsController.deleteCustomsDeclaration);

// Inventory Movements (Withdrawn Items) routes
router.get('/movements', movementsController.getWithdrawnItems);
router.get('/movements/job/:jobId', movementsController.getMovementsByJob);
router.get('/movements/stats', movementsController.getWithdrawnItemsStats);
router.post('/movements/reserve', movementsController.reserveItemForJob);
router.put('/movements/:movementId/issue', movementsController.issueReservedItem);
router.put('/movements/:movementId/return', movementsController.returnItem);

// Calculations routes
router.get('/calculations', calculationsController.getCalculations);

export default router;

