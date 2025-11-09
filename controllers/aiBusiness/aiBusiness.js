import AIBusinessIdea from '../../models/aiBusinessIdea.js';
import CompanyModel from '../../models/auth/company.js';

const ensureAuth = (req, res) => {
  const email = req.user?.email;
  if (!email) {
    res.status(401).json({ message: 'Korisnik nije autentifikovan.' });
    return null;
  }
  return email;
};

const ensureSuperAdmin = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Korisnik nije autentifikovan.' });
    return false;
  }

  try {
    const user = await CompanyModel.findById(userId).select('role');
    if (user?.role === 'superadmin') {
      return true;
    }
    res.status(403).json({ message: 'Samo superadmin ima pristup ovoj akciji.' });
    return false;
  } catch (error) {
    console.error('Greška pri proveri superadmin prava:', error);
    res.status(500).json({ message: 'Greška pri proveri privilegija.' });
    return false;
  }
};

export const getIdeas = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const ideas = await AIBusinessIdea.find({})
      .sort({ phase: 1, createdAt: -1 })
      .lean();
    res.status(200).json(ideas);
  } catch (error) {
    console.error('Greška pri učitavanju AI biznis ideja:', error);
    res.status(500).json({ message: 'Greška pri učitavanju ideja.' });
  }
};

export const createIdea = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;
  if (!(await ensureSuperAdmin(req, res))) return;

  try {
    const { title, phase, summary, actionSteps, aiAssist, impact, resources, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Naslov je obavezan.' });
    }
    if (!phase || !phase.trim()) {
      return res.status(400).json({ message: 'Faza je obavezna.' });
    }

    const idea = await AIBusinessIdea.create({
      title: title.trim(),
      phase: phase.trim(),
      summary: summary?.trim() || '',
      actionSteps: Array.isArray(actionSteps)
        ? actionSteps.filter(Boolean)
        : typeof actionSteps === 'string'
        ? actionSteps
            .split('\n')
            .map((step) => step.trim())
            .filter(Boolean)
        : [],
      aiAssist: aiAssist?.trim() || '',
      impact: impact?.trim() || '',
      resources: resources?.trim() || '',
      tags: Array.isArray(tags)
        ? tags.filter(Boolean)
        : typeof tags === 'string'
        ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      createdBy: userEmail,
    });

    res.status(201).json(idea.toJSON());
  } catch (error) {
    console.error('Greška pri dodavanju AI biznis ideje:', error);
    res.status(500).json({ message: 'Greška pri čuvanju ideje.' });
  }
};

export const updateIdea = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;
  if (!(await ensureSuperAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const { title, phase, summary, actionSteps, aiAssist, impact, resources, tags } = req.body;

    const idea = await AIBusinessIdea.findById(id);
    if (!idea) {
      return res.status(404).json({ message: 'Ideja nije pronađena.' });
    }

    if (title !== undefined) idea.title = title.trim();
    if (phase !== undefined) idea.phase = phase.trim();
    if (summary !== undefined) idea.summary = summary.trim();
    if (aiAssist !== undefined) idea.aiAssist = aiAssist.trim();
    if (impact !== undefined) idea.impact = impact.trim();
    if (resources !== undefined) idea.resources = resources.trim();
    if (actionSteps !== undefined) {
      idea.actionSteps = Array.isArray(actionSteps)
        ? actionSteps.filter(Boolean)
        : typeof actionSteps === 'string'
        ? actionSteps
            .split('\n')
            .map((step) => step.trim())
            .filter(Boolean)
        : [];
    }
    if (tags !== undefined) {
      idea.tags = Array.isArray(tags)
        ? tags.filter(Boolean)
        : typeof tags === 'string'
        ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
    }

    await idea.save();

    res.status(200).json(idea.toJSON());
  } catch (error) {
    console.error('Greška pri ažuriranju AI biznis ideje:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju ideje.' });
  }
};

export const deleteIdea = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;
  if (!(await ensureSuperAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const idea = await AIBusinessIdea.findById(id);
    if (!idea) {
      return res.status(404).json({ message: 'Ideja nije pronađena.' });
    }

    await idea.deleteOne();

    res.status(200).json({ message: 'Ideja je uspešno obrisana.' });
  } catch (error) {
    console.error('Greška pri brisanju AI biznis ideje:', error);
    res.status(500).json({ message: 'Greška pri brisanju ideje.' });
  }
};


