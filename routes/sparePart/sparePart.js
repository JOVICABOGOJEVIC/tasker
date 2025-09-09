import express from 'express';
import { createSparePart, getSpareParts, getSparePart, updateSparePart, deleteSparePart } from '../../controllers/sparePart/sparePart.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createSparePart);
router.get('/', auth, getSpareParts);
router.get('/:id', auth, getSparePart);
router.patch('/:id', auth, updateSparePart);
router.delete('/:id', auth, deleteSparePart);

export default router; 