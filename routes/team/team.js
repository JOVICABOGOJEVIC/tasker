import express from 'express';
import { createTeam, getTeams, getTeam, updateTeam, deleteTeam } from '../../controllers/team/team.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createTeam);
router.get('/', auth, getTeams);
router.get('/:id', auth, getTeam);
router.patch('/:id', auth, updateTeam);
router.delete('/:id', auth, deleteTeam);

export default router; 