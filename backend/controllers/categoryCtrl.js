const asyncHandler = require("express-async-handler");
const Category = require("../model/Category");
const Transaction = require("../model/Transaction");

const categoryController = {
  //! CREATE CATEGORY
  create: asyncHandler(async (req, res) => {
    const { name, type } = req.body;

    if (!name || !type) {
      res.status(400);
      throw new Error("Name and type are required");
    }

    const normalizedName = name.toLowerCase();

    // --- FIX 1: Check if the category already exists FOR THIS USER ---
    const categoryExists = await Category.findOne({
      name: normalizedName,
      user: req.user.id, // This was missing
    });

    if (categoryExists) {
      res.status(400);
      throw new Error(`Category "${name}" already exists for this user`);
    }

    // --- FIX 2: Save the category with the logged-in user's ID ---
    const category = await Category.create({
      name: normalizedName,
      type,
      user: req.user.id, // This was missing
    });

    res.status(201).json(category);
  }),

  //! LIST CATEGORIES
  lists: asyncHandler(async (req, res) => {
    // --- FIX 3: Find ONLY the categories belonging to this user ---
    const categories = await Category.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json(categories);
  }),

  //! UPDATE CATEGORY
  update: asyncHandler(async (req, res) => {
    // --- FIX 4: Use "id" to match your route (not categoryId) ---
    const { id } = req.params;
    const { name, type } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    // --- FIX 5: Add an ownership check ---
    if (category.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error("Not authorized to update this category");
    }

    const oldName = category.name;
    const normalizedName = name?.toLowerCase();

    // Update fields
    category.name = normalizedName || category.name;
    category.type = type || category.type;

    const updatedCategory = await category.save();

    // --- FIX 6: If name changed, update related transactions FOR THIS USER ONLY ---
    if (oldName !== updatedCategory.name) {
      await Transaction.updateMany(
        { user: req.user.id, category: oldName }, // Added user: req.user.id
        { $set: { category: updatedCategory.name } }
      );
    }

    res.json(updatedCategory);
  }),

  //! DELETE CATEGORY
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      res.status(404);
      throw new Error("Category not found");
    }

    // --- FIX 7: Add an ownership check ---
    if (category.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error("Not authorized to delete this category");
    }

    // --- FIX 8: Update this user's transactions to "Uncategorized" ---
    await Transaction.updateMany(
      { user: req.user.id, category: category.name }, // Added user: req.user.id
      { $set: { category: "Uncategorized" } }
    );

    // Now, delete the category
    await Category.findByIdAndDelete(id);

    res.json({
      message: "Category deleted and related transactions updated",
    });
  }),
};

module.exports = categoryController;