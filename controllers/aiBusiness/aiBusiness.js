import AIBusinessIdea from '../../models/aiBusinessIdea.js';
import AIBusinessIdeaResponse from '../../models/aiBusinessIdeaResponse.js';
import CompanyModel from '../../models/auth/company.js';

const ensureAuth = (req, res) => {
  const email = req.user?.email;
  const companyId = req.user?.id || req.userId;

  if (!email || !companyId) {
    res.status(401).json({ message: 'Korisnik nije autentifikovan.' });
    return null;
  }

  return {
    email,
    companyId,
    role: req.user?.role || 'company',
  };
};

const ensureSuperAdmin = async (req, res) => {
  if (req.user?.role === 'superadmin') {
    return true;
  }

  const userId = req.user?.id || req.userId;
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

const summarizeIdeaResponses = (responses = []) => {
  if (!responses.length) {
    return {
      acceptedCount: 0,
      declinedCount: 0,
      accepted: [],
      declined: [],
    };
  }

  const accepted = [];
  const declined = [];

  responses.forEach((response) => {
    const entry = {
      companyId: response.company?._id?.toString() || response.company?.id || '',
      companyName: response.company?.companyName || 'Nepoznata kompanija',
      email: response.company?.email || response.companyEmail || '',
      status: response.status,
      respondedAt: response.updatedAt,
    };

    if (response.status === 'accepted') {
      accepted.push(entry);
    } else if (response.status === 'declined') {
      declined.push(entry);
    }
  });

  return {
    acceptedCount: accepted.length,
    declinedCount: declined.length,
    accepted,
    declined,
  };
};

export const getIdeas = async (req, res) => {
  const authContext = ensureAuth(req, res);
  if (!authContext) return;

  try {
    const ideasFromDb = await AIBusinessIdea.find({})
      .sort({ phase: 1, createdAt: -1 })
      .lean();

    if (ideasFromDb.length === 0) {
      return res.status(200).json([]);
    }

    const ideaIds = ideasFromDb.map((idea) => idea._id);
    const responses = await AIBusinessIdeaResponse.find({ idea: { $in: ideaIds } })
      .populate('company', 'companyName email')
      .lean();

    const responsesByIdea = new Map();
    responses.forEach((response) => {
      const key = response.idea.toString();
      if (!responsesByIdea.has(key)) {
        responsesByIdea.set(key, []);
      }
      responsesByIdea.get(key).push(response);
    });

    const companyIdString = authContext.companyId.toString();
    const isSuperAdmin = authContext.role === 'superadmin';

    const ideas = ideasFromDb.map((ideaDoc) => {
      const ideaId = ideaDoc._id.toString();
      const ideaResponses = responsesByIdea.get(ideaId) || [];

      const userResponse = ideaResponses.find(
        (response) =>
          response.company?.toString?.() === companyIdString ||
          response.company?._id?.toString?.() === companyIdString
      );

      const idea = {
        ...ideaDoc,
        id: ideaId,
        userResponse: userResponse
          ? {
              status: userResponse.status,
              updatedAt: userResponse.updatedAt,
            }
          : null,
      };

      delete idea._id;

      if (isSuperAdmin) {
        idea.responsesSummary = summarizeIdeaResponses(ideaResponses);
      }

      return idea;
    });

    res.status(200).json(ideas);
  } catch (error) {
    console.error('Greška pri učitavanju AI biznis ideja:', error);
    res.status(500).json({ message: 'Greška pri učitavanju ideja.' });
  }
};

export const createIdea = async (req, res) => {
  const authContext = ensureAuth(req, res);
  if (!authContext) return;
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
      createdBy: authContext.email,
    });

    res.status(201).json(idea.toJSON());
  } catch (error) {
    console.error('Greška pri dodavanju AI biznis ideje:', error);
    res.status(500).json({ message: 'Greška pri čuvanju ideje.' });
  }
};

export const updateIdea = async (req, res) => {
  const authContext = ensureAuth(req, res);
  if (!authContext) return;
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
  const authContext = ensureAuth(req, res);
  if (!authContext) return;
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

export const respondToIdea = async (req, res) => {
  const authContext = ensureAuth(req, res);
  if (!authContext) return;

  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const trimmedNote = note?.trim() || '';

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Status mora biti accepted ili declined.' });
    }

    const idea = await AIBusinessIdea.findById(id);
    if (!idea) {
      return res.status(404).json({ message: 'Ideja nije pronađena.' });
    }

    const responseDoc = await AIBusinessIdeaResponse.findOneAndUpdate(
      { idea: idea._id, company: authContext.companyId },
      {
        $set: {
          status,
          note: trimmedNote,
          companyEmail: authContext.email,
        },
        $setOnInsert: {
          idea: idea._id,
          company: authContext.companyId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('company', 'companyName email')
      .lean();

    const ideaResponses = await AIBusinessIdeaResponse.find({ idea: idea._id })
      .populate('company', 'companyName email')
      .lean();

    const summary = summarizeIdeaResponses(ideaResponses);

    res.status(200).json({
      ideaId: idea._id.toString(),
      status: responseDoc.status,
      updatedAt: responseDoc.updatedAt,
      summary,
    });
  } catch (error) {
    console.error('Greška pri čuvanju odgovora za AI biznis ideju:', error);
    res.status(500).json({ message: 'Greška pri čuvanju odgovora.' });
  }
};

