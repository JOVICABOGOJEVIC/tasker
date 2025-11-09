import express from 'express';
import auth from '../middleware/auth.js';
import {
  getIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
  respondToIdea,
} from '../controllers/aiBusiness/aiBusiness.js';

const router = express.Router();

router.use(auth);

router.get('/', getIdeas);
router.post('/', createIdea);
router.put('/:id', updateIdea);
router.delete('/:id', deleteIdea);
router.post('/:id/respond', respondToIdea);

export default router;


