const express = require('express');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateItem } = require('../middleware/validation');
const { uploadItemImages, handleUploadError } = require('../middleware/upload');
const router = express.Router();

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post('/', auth, uploadItemImages, handleUploadError, validateItem, async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      owner: req.user.id
    };

    if (req.files && req.files.length > 0) {
      itemData.images = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        uploadedAt: new Date()
      }));
    }

    const item = new Item(itemData);
    await item.save();
    
    // Update user's items listed count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { itemsListed: 1 }
    });

    await item.populate('owner', 'name rating profilePicture');

    res.status(201).json({
      status: 'success',
      message: 'Item created successfully',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/items
// @desc    Get all items with search and filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isActive: true, isAvailable: true };

    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Category filter
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.dailyPrice = {};
      if (req.query.minPrice) {
        query.dailyPrice.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.dailyPrice.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Location filter
    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-low':
          sort = { dailyPrice: 1 };
          break;
        case 'price-high':
          sort = { dailyPrice: -1 };
          break;
        case 'rating':
          sort = { 'rating.average': -1 };
          break;
        case 'popular':
          sort = { totalBookings: -1 };
          break;
      }
    }

    const items = await Item.find(query)
      .populate('owner', 'name rating profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalItems = await Item.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/items/:id
// @desc    Get single item
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('owner', 'name rating profilePicture phone createdAt');

    if (!item || !item.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    res.json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/items/user/my-items
// @desc    Get user's items
// @access  Private
router.get('/user/my-items', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const items = await Item.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalItems = await Item.countDocuments({ owner: req.user.id });

    res.json({
      status: 'success',
      data: {
        items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private
router.put('/:id', auth, uploadItemImages, handleUploadError, validateItem, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this item'
      });
    }

    const updates = { ...req.body };

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        uploadedAt: new Date()
      }));
      updates.images = [...(item.images || []), ...newImages];
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('owner', 'name rating profilePicture');

    res.json({
      status: 'success',
      message: 'Item updated successfully',
      data: { item: updatedItem }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this item'
      });
    }

    // Soft delete - mark as inactive
    item.isActive = false;
    await item.save();

    // Update user's items listed count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { itemsListed: -1 }
    });

    res.json({
      status: 'success',
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/items/categories/list
// @desc    Get all categories with counts
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Item.aggregate([
      { $match: { isActive: true, isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      status: 'success',
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;