const { v4: uuid } = require('uuid');
const jimp = require('jimp');

const Category = require('../models/Category');
const User = require('../models/User');
const Ad = require('../models/Ad');

const addImage = async (buffer) => {
  let newName = `${uuid()}.jpg`;
  let temporaryImage = await jimp.read(buffer);

  console.log('TEMPORARY IMAGE: ', temporaryImage);
  temporaryImage.cover(500, 500).quality(80).write(`./public/media/${newName}`);
  return newName;
};

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
  addAction: async (req, res) => {
    let { title, price, priceNegotiable, description, category, token } =
      req.body;
    const user = await User.findOne({ token }).exec();

    if (!title || !category) {
      return res.json({ error: 'Título e/ou categoria não foram preenchidos' });
    }

    if (price) {
      price = price.replace('.', '').replace(',', '.').replace('R$ ', '');
      price = parseFloat(price);
    } else {
      price = 0;
    }

    const newAd = new Ad();
    newAd.status = true;
    newAd.User = user._id;
    newAd.state = user.state;
    newAd.dateCreated = new Date();
    newAd.title = title;
    newAd.category = category;
    newAd.price = price;
    newAd.priceNegotiable = priceNegotiable === 'true' ? true : false;
    newAd.description = description;
    newAd.views = 0;

    if (req.files && req.files.img) {
      if (req.files.img.length === undefined) {
        //? Se tiver 1 imagem, se torna um objeto, com length undefined
        if (
          ['image/jpg', 'image/jpeg', 'image/png'].includes(
            req.files.img.mimetype
          )
        ) {
          let url = await addImage(req.files.img.data);
          newAd.images.push({
            url,
            default: false
          });
        }
      } else {
        //? Se tiver mais de 1 imagem, se torna um array de objetos
        for (let i = 0; i < req.files.img.length; i++) {
          if (
            ['image/jpg', 'image/jpeg', 'image/png'].includes(
              req.files.img[i].mimetype
            )
          ) {
            let url = await addImage(req.files.img[i].data);
            newAd.images.push({
              url,
              default: false
            });
          }
        }
      }
    }

    newAd.images.length > 0 ?? (newAd.images[0].default = true);

    const info = await newAd.save();
    res.json({ id: info._id });
  },
  getList: async (req, res) => {},
  getIten: async (req, res) => {},
  editAction: async (req, res) => {}
};
