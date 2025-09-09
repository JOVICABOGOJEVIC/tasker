import express from 'express';
import { createClient, getClients, getClient, updateClient, deleteClient } from '../../controllers/client/client.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createClient);
router.get('/', auth, getClients);
router.get('/:id', auth, getClient);
router.put('/:id', auth, updateClient);
router.patch('/:id', auth, updateClient);
router.delete('/:id', auth, deleteClient);

export default router; 