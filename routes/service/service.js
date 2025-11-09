import express from 'express';
import auth from '../../middleware/auth.js';
import {
  getDeviceCategories,
  createDeviceCategory,
  updateDeviceCategory,
  deleteDeviceCategory,
  getDeviceTypes,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
  getServices,
  createService,
  updateService,
  deleteService,
} from '../../controllers/service/service.js';

const router = express.Router();

router.use(auth);

router.get('/device-categories', getDeviceCategories);
router.post('/device-categories', createDeviceCategory);
router.put('/device-categories/:id', updateDeviceCategory);
router.delete('/device-categories/:id', deleteDeviceCategory);

router.get('/device-types', getDeviceTypes);
router.post('/device-types', createDeviceType);
router.put('/device-types/:id', updateDeviceType);
router.delete('/device-types/:id', deleteDeviceType);

router.get('/', getServices);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;

