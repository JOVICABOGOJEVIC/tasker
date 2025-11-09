import mongoose from 'mongoose';
import DeviceCategory from '../../models/deviceCategory.js';
import DeviceType from '../../models/deviceType.js';
import Service from '../../models/service.js';

const ensureAuth = (req, res) => {
  const email = req.user?.email;
  if (!email) {
    res.status(401).json({ message: 'Korisnik nije autentifikovan.' });
    return null;
  }
  return email;
};

const mapCategory = (category) => ({
  id: category.id || category._id?.toString(),
  name: category.name,
  color: category.color,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const mapDeviceType = (type) => ({
  id: type.id || type._id?.toString(),
  name: type.name,
  categoryId: type.category?._id?.toString?.() || type.category?.toString?.(),
  category: type.category && type.category.name ? mapCategory(type.category) : undefined,
  createdAt: type.createdAt,
  updatedAt: type.updatedAt,
});

const normalizeId = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString?.() || undefined;
};

const mapService = (service, options = {}) => {
  const deviceType = options.deviceType ?? service.deviceType;
  const deviceCategory = options.deviceCategory ?? service.deviceCategory;
  const durationMinutes =
    options.durationMinutes ??
    service.durationMinutes ??
    (service.durationInMinutes !== undefined ? service.durationInMinutes : null);

  const deviceTypeId =
    options.deviceTypeId ??
    normalizeId(service.deviceTypeId) ??
    normalizeId(service.deviceType) ??
    normalizeId(service.type) ??
    undefined;

  let deviceCategoryId =
    options.deviceCategoryId ??
    normalizeId(service.deviceCategoryId) ??
    normalizeId(service.deviceCategory) ??
    normalizeId(service.category) ??
    undefined;

  const resolvedDeviceType = deviceType || (deviceTypeId ? options.deviceTypeMap?.get(deviceTypeId) : undefined);
  if (!deviceCategoryId && resolvedDeviceType) {
    deviceCategoryId =
      normalizeId(resolvedDeviceType.category) ||
      (resolvedDeviceType.categoryId ? normalizeId(resolvedDeviceType.categoryId) : undefined);
  }

  const resolvedDeviceCategory =
    deviceCategory ||
    (deviceCategoryId ? (options.deviceCategoryMap?.get(deviceCategoryId) ?? undefined) : undefined);

  return {
    id: service.id || service._id?.toString(),
    name: service.name,
    price: service.price,
    notes: service.notes,
    deviceTypeId,
    deviceCategoryId,
    deviceType: resolvedDeviceType ? mapDeviceType(resolvedDeviceType) : undefined,
    deviceCategory: resolvedDeviceCategory ? mapCategory(resolvedDeviceCategory) : undefined,
    durationMinutes,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
};

export const getDeviceCategories = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const categories = await DeviceCategory.find({ userEmail }).sort({ name: 1 }).lean();
    res.status(200).json(categories.map(mapCategory));
  } catch (error) {
    console.error('Greška pri učitavanju kategorija uređaja:', error);
    res.status(500).json({ message: 'Greška pri učitavanju kategorija uređaja.' });
  }
};

export const createDeviceCategory = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Naziv kategorije je obavezan.' });
    }

    const duplicate = await DeviceCategory.findOne({
      userEmail,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (duplicate) {
      return res.status(400).json({ message: 'Kategorija sa tim nazivom već postoji.' });
    }

    const category = await DeviceCategory.create({
      name: name.trim(),
      color: color || '#3B82F6',
      userEmail,
      businessType: req.user?.businessType || null,
    });

    res.status(201).json(mapCategory(category));
  } catch (error) {
    console.error('Greška pri dodavanju kategorije uređaja:', error);
    res.status(500).json({ message: 'Greška pri čuvanju kategorije.' });
  }
};

export const updateDeviceCategory = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const category = await DeviceCategory.findOne({ _id: id, userEmail });
    if (!category) {
      return res.status(404).json({ message: 'Kategorija nije pronađena.' });
    }

    if (name && name.trim()) {
      const duplicate = await DeviceCategory.findOne({
        userEmail,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Naziv kategorije је већ искоришћен.' });
      }
      category.name = name.trim();
    }

    if (color) {
      category.color = color;
    }

    await category.save();
    res.status(200).json(mapCategory(category));
  } catch (error) {
    console.error('Greška pri ažuriranju kategorije uređaja:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju kategorije.' });
  }
};

export const deleteDeviceCategory = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;

    const category = await DeviceCategory.findOneAndDelete({ _id: id, userEmail });
    if (!category) {
      return res.status(404).json({ message: 'Kategorija nije pronađena.' });
    }

    await DeviceType.deleteMany({ category: id, userEmail });
    await Service.deleteMany({ deviceCategory: id, userEmail });

    res.status(200).json({ message: 'Kategorija је обрисана.' });
  } catch (error) {
    console.error('Greška pri brisanju kategorije uređaja:', error);
    res.status(500).json({ message: 'Greška pri brisanju kategorije.' });
  }
};

export const getDeviceTypes = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const deviceTypes = await DeviceType.find({ userEmail })
      .populate('category')
      .sort({ name: 1 })
      .lean();
    res.status(200).json(deviceTypes.map(mapDeviceType));
  } catch (error) {
    console.error('Greška pri učitavanju tipova uređaja:', error);
    res.status(500).json({ message: 'Greška pri učitavanju tipova uređaja.' });
  }
};

export const createDeviceType = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { name, categoryId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Naziv uređaja je obavezan.' });
    }

    if (!categoryId) {
      return res.status(400).json({ message: 'Kategorija је obavezna.' });
    }

    const category = await DeviceCategory.findOne({ _id: categoryId, userEmail });
    if (!category) {
      return res.status(404).json({ message: 'Kategorija није pronađena.' });
    }

    const duplicate = await DeviceType.findOne({
      userEmail,
      category: categoryId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (duplicate) {
      return res.status(400).json({ message: 'Uređaj sa tim nazivom već postoji u izabranoj kategoriji.' });
    }

    const deviceType = await DeviceType.create({
      name: name.trim(),
      category: category._id,
      userEmail,
      businessType: req.user?.businessType || null,
    });

    await deviceType.populate('category');

    res.status(201).json(mapDeviceType(deviceType));
  } catch (error) {
    console.error('Greška pri dodavanju tipa uređaja:', error);
    res.status(500).json({ message: 'Greška pri čuvanju tipa uređaja.' });
  }
};

export const updateDeviceType = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    const deviceType = await DeviceType.findOne({ _id: id, userEmail });
    if (!deviceType) {
      return res.status(404).json({ message: 'Tip uređaja није pronađen.' });
    }

    if (categoryId && categoryId.toString() !== deviceType.category.toString()) {
      const category = await DeviceCategory.findOne({ _id: categoryId, userEmail });
      if (!category) {
        return res.status(404).json({ message: 'Nova kategorija nije pronađena.' });
      }
      deviceType.category = category._id;
    }

    if (name && name.trim()) {
      const duplicate = await DeviceType.findOne({
        userEmail,
        _id: { $ne: id },
        category: deviceType.category,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Uređaj sa tim nazivom već postoji u izabranoj kategoriji.' });
      }
      deviceType.name = name.trim();
    }

    await deviceType.save();
    await deviceType.populate('category');

    res.status(200).json(mapDeviceType(deviceType));
  } catch (error) {
    console.error('Greška pri ažuriranju tipa uređaja:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju tipa uređaja.' });
  }
};

export const deleteDeviceType = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;

    const deviceType = await DeviceType.findOneAndDelete({ _id: id, userEmail });
    if (!deviceType) {
      return res.status(404).json({ message: 'Tip uređaja није pronađen.' });
    }

    await Service.deleteMany({ deviceType: id, userEmail });

    res.status(200).json({ message: 'Tip uređaja је obrisan.' });
  } catch (error) {
    console.error('Greška pri brisanju tipa uređaja:', error);
    res.status(500).json({ message: 'Greška pri brisanju tipa uređaja.' });
  }
};

export const getServices = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const [services, deviceTypes, deviceCategories] = await Promise.all([
      Service.find({ userEmail }).sort({ createdAt: -1 }).lean(),
      DeviceType.find({ userEmail }).lean(),
      DeviceCategory.find({ userEmail }).lean(),
    ]);

    const deviceTypeMap = new Map(deviceTypes.map((type) => [normalizeId(type._id), type]));
    const deviceCategoryMap = new Map(deviceCategories.map((category) => [normalizeId(category._id), category]));

    const response = services.map((service) =>
      mapService(service, {
        deviceTypeMap,
        deviceCategoryMap,
      })
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Greška pri učitavanju usluga:', error);
    res.status(500).json({ message: 'Greška pri učitavanju usluga.' });
  }
};

export const createService = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { name, price, notes, durationMinutes, deviceTypeId, deviceCategoryId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Naziv usluge je obavezan.' });
    }

    let deviceType = null;
    let deviceCategory = null;

    if (deviceTypeId) {
      deviceType = await DeviceType.findOne({ _id: deviceTypeId, userEmail }).populate('category');
      if (!deviceType) {
        return res.status(404).json({ message: 'Tip uređaja није pronađen.' });
      }
      if (deviceType.category) {
        deviceCategory = deviceType.category;
      }
    }

    if (!deviceCategory) {
      if (!deviceCategoryId) {
        return res.status(400).json({ message: 'Kategorija je obavezna.' });
      }
      deviceCategory = await DeviceCategory.findOne({ _id: deviceCategoryId, userEmail });
      if (!deviceCategory) {
        return res.status(404).json({ message: 'Kategorija није pronađena.' });
      }
    }

    const service = await Service.create({
      name: name.trim(),
      price: price !== undefined && price !== null && price !== '' ? Number(price) : null,
      notes: notes?.trim() || '',
      durationMinutes:
        durationMinutes !== undefined && durationMinutes !== null && durationMinutes !== ''
          ? Number(durationMinutes)
          : null,
      deviceType: deviceType?._id || null,
      deviceCategory: deviceCategory._id,
      userEmail,
      businessType: req.user?.businessType || null,
    });

    if (deviceType) {
      await service.populate({ path: 'deviceType', populate: { path: 'category' } });
    }
    await service.populate('deviceCategory');

    res.status(201).json(
      mapService(service, {
        deviceType,
        deviceCategory,
        durationMinutes: service.durationMinutes,
      })
    );
  } catch (error) {
    console.error('Greška pri dodavanju usluge:', error);
    res.status(500).json({ message: 'Greška pri čuvanju usluge.' });
  }
};

export const updateService = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;
    const { name, price, notes, durationMinutes, deviceTypeId, deviceCategoryId } = req.body;

    const service = await Service.findOne({ _id: id, userEmail });
    if (!service) {
      return res.status(404).json({ message: 'Usluga није pronađena.' });
    }

    if (name && name.trim()) {
      service.name = name.trim();
    }

    if (price !== undefined) {
      service.price = price === '' || price === null ? null : Number(price);
    }

    if (notes !== undefined) {
      service.notes = notes?.trim() || '';
    }

    if (durationMinutes !== undefined) {
      service.durationMinutes =
        durationMinutes === '' || durationMinutes === null ? null : Number(durationMinutes);
    }

    let deviceType = null;
    if (deviceTypeId) {
      deviceType = await DeviceType.findOne({ _id: deviceTypeId, userEmail }).populate('category');
      if (!deviceType) {
        return res.status(404).json({ message: 'Tip uređaja није pronađen.' });
      }
      service.deviceType = deviceType._id;
      service.deviceCategory = deviceType.category?._id || service.deviceCategory;
    } else if (deviceCategoryId) {
      const deviceCategory = await DeviceCategory.findOne({ _id: deviceCategoryId, userEmail });
      if (!deviceCategory) {
        return res.status(404).json({ message: 'Kategorija није pronađena.' });
      }
      service.deviceCategory = deviceCategory._id;
      service.deviceType = null;
    }

    await service.save();
    if (service.deviceType) {
      await service.populate({ path: 'deviceType', populate: { path: 'category' } });
      deviceType = service.deviceType;
    }
    await service.populate('deviceCategory');

    res.status(200).json(
      mapService(service, {
        deviceType,
        deviceCategory: service.deviceCategory,
        durationMinutes: service.durationMinutes,
      })
    );
  } catch (error) {
    console.error('Greška pri ažuriranju usluge:', error);
    res.status(500).json({ message: 'Greška pri ažuriranju usluge.' });
  }
};

export const deleteService = async (req, res) => {
  const userEmail = ensureAuth(req, res);
  if (!userEmail) return;

  try {
    const { id } = req.params;

    const service = await Service.findOneAndDelete({ _id: id, userEmail });
    if (!service) {
      return res.status(404).json({ message: 'Usluga није pronađena.' });
    }

    res.status(200).json({ message: 'Usluga је обрисана.' });
  } catch (error) {
    console.error('Greška pri brisanju usluge:', error);
    res.status(500).json({ message: 'Greška pri brisanju usluge.' });
  }
};

