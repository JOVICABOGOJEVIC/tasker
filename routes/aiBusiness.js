import express from 'express';
import auth from '../middleware/auth.js';
import {
  getIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
} from '../controllers/aiBusiness/aiBusiness.js';

const router = express.Router();

router.use(auth);

router.get('/', getIdeas);
router.post('/', createIdea);
router.put('/:id', updateIdea);
router.delete('/:id', deleteIdea);

export default router;


