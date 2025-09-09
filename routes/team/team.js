import express from 'express';
import { createTeam, getTeams, getTeam, updateTeam, deleteTeam } from '../../controllers/team/team.js';

const router = express.Router();

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.patch('/:id', updateTeam);
router.delete('/:id', deleteTeam);

export default router; 