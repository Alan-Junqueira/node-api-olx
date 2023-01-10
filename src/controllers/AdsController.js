const Category = require('../models/Category');

module.exports = {
  getCategories: async (req, res) => {
    const cats = await Category.find();
    let categories = [];

    for (let i in cats) {
      categories.push({
        ...cats[i]._doc,
        img: `${process.env.BASE}:${process.env.PORT}/assets/images/${cats[i].slug}.png`
      });
    }

    return res.json({ categories });
  },
  addAction: async (req, res) => {},
  getList: async (req, res) => {},
  getIten: async (req, res) => {},
  editAction: async (req, res) => {}
};
