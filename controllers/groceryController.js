const PDFDocument = require('pdfkit');
const GroceryList = require('../models/GroceryList');

// Get grocery list for user
exports.getGroceryList = async (req, res) => {
  try {
    const groceryList = await GroceryList.findOne({ user: req.user._id });
    if (!groceryList) return res.json({ items: [] });
    res.json({ items: groceryList.items });
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    res.status(500).json({ message: 'Failed to fetch grocery list' });
  }
};

// Toggle bought/pending status of a grocery item
exports.toggleGroceryItemStatus = async (req, res) => {
  try {
    const { itemId } = req.params;

    const groceryList = await GroceryList.findOne({ user: req.user._id });
    if (!groceryList) return res.status(404).json({ message: 'Grocery list not found' });

    const item = groceryList.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.bought = !item.bought;

    // Tell Mongoose we modified `items`
    groceryList.markModified('items');

    // Reorder list: pending items first, bought items last
    groceryList.items.sort((a, b) => (a.bought === b.bought ? 0 : a.bought ? 1 : -1));

    await groceryList.save();

    res.json({ message: 'Item status toggled', items: groceryList.items });
  } catch (error) {
    console.error('Error toggling item status:', error);
    res.status(500).json({ message: 'Failed to toggle item status' });
  }
};

// Create or update grocery list for user
exports.createOrUpdateGroceryList = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    let groceryList = await GroceryList.findOne({ user: req.user._id });

    if (groceryList) {
      groceryList.items = items;
    } else {
      groceryList = new GroceryList({ user: req.user._id, items });
    }

    await groceryList.save();

    res.status(200).json({ message: 'Grocery list saved successfully', items: groceryList.items });
  } catch (error) {
    console.error('Failed to save grocery list:', error);
    res.status(500).json({ message: 'Failed to save grocery list' });
  }
};

exports.deleteGroceryItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;

    const groceryList = await GroceryList.findOne({ user: userId });
    if (!groceryList) {
      return res.status(404).json({ message: 'Grocery list not found' });
    }

    // Remove the item
    groceryList.items = groceryList.items.filter(
      item => item._id.toString() !== itemId
    );

    await groceryList.save();

    res.json({ items: groceryList.items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
};

// Export grocery list as PDF
exports.exportGroceryListPDF = async (req, res) => {
  try {
    const groceryList = await GroceryList.findOne({ user: req.user._id });
    if (!groceryList || groceryList.items.length === 0) {
      return res.status(404).json({ message: 'No grocery items to export' });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="grocery-list.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).text('🛒 Grocery List', { align: 'center' }).moveDown();

    groceryList.items.forEach((item, i) => {
      const status = item.bought ? '[✓ Bought]' : '[ ] Pending';
      doc.fontSize(12).text(`${i + 1}. ${item.name} - ${item.quantity || ''} ${status}`);
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to export grocery list' });
    } else {
      // if headers already sent, just end the response to avoid errors
      res.end();
    }
  }
};

