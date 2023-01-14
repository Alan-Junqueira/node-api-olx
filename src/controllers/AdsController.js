const { v4: uuid } = require('uuid');
const jimp = require('jimp');

const Category = require('../models/Category');
const User = require('../models/User');
const Ad = require('../models/Ad');
const State = require('../models/State');

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

    if (category.length < 12) {
      return res.json({ error: 'Id de categoria inválido' });
    }

    const categoryMatch = await Category.findById(category);
    if (!categoryMatch) {
      return res.json({ error: 'Categoria inexistente' });
    }

    if (price) {
      price = price.replace('.', '').replace(',', '.').replace('R$ ', '');
      price = parseFloat(price);
    } else {
      price = 0;
    }

    const newAd = new Ad();
    newAd.status = true;
    newAd.idUser = user._id;
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
    return res.json({ id: info._id });
  },
  getList: async (req, res) => {
    let {
      sort = 'asc',
      offset = 0,
      limit = 8,
      query,
      category,
      state
    } = req.query;
    let filters = { status: true };
    let total = 0;

    if (query) {
      //? options: i ==> Case insensitive
      filters.title = { $regex: query, $options: 'i' };
    }

    if (category) {
      const c = await Category.findOne({ slug: category }).exec();
      if (c) {
        filters.category = c._id.toString();
      }
    }

    if (state) {
      const s = await State.findOne({ name: state.toUpperCase() }).exec();
      filters.state = s._id.toString();
    }

    const adsTotal = await Ad.find(filters).exec();
    total = adsTotal.length;

    const adsData = await Ad.find(filters)
      .sort({ dateCreated: sort === 'desc' ? -1 : 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .exec();
    let ads = [];
    for (let i in adsData) {
      let image;

      let defaultImage = adsData[i].images.find((e) => e.default);
      if (defaultImage) {
        image = `${process.env.BASE}:${process.env.PORT}/media/${defaultImage.url}`;
      } else {
        image = `${process.env.BASE}:${process.env.PORT}/media/default.jpg`;
      }
      ads.push({
        id: adsData[i]._id,
        title: adsData[i].title,
        price: adsData[i].price,
        priceNegotiable: adsData[i].priceNegotiable,
        image
      });
    }

    return res.json({ ads, total });
  },
  getIten: async (req, res) => {
    let { id, other = null } = req.query;

    if (!id) {
      return res.json({ error: 'Sem produto' });
    }

    if (id.length < 12) {
      return res.json({ error: 'ID inválido' });
    }

    try {
      const ad = await Ad.findById(id);

      if (!ad) {
        return res.json({ error: 'Produto inexistente' });
      }

      ad.views++;
      await ad.save();

      let images = [];
      for (let i in ad.images) {
        images.push(
          `${process.env.BASE}:${process.env.PORT}/media/${ad.images[i].url}`
        );
      }

      let category = await Category.findById(ad.category).exec();
      let user = await User.findById(ad.idUser).exec();
      let state = await State.findById(ad.state).exec();

      let others = [];
      if (others) {
        const otherData = await Ad.find({
          status: true,
          idUser: ad.idUser
        }).exec();

        for (let i in otherData) {
          if (otherData[i]._id.toString() !== ad._id.toString()) {
            let image = `${process.env.BASE}:${process.env.PORT}/media/default.jpg}`;

            let defaultImage = otherData[i].images.find((e) => e.default);

            if (defaultImage) {
              image = `${process.env.BASE}:${process.env.PORT}/media/${defaultImage.url}`;
            }

            others.push({
              id: otherData[i]._id,
              title: otherData[i].title,
              price: otherData[i].price,
              priceNegotiable: otherData[i].priceNegotiable,
              image
            });
          }
        }
      }

      return res.json({
        id: ad._id,
        title: ad.title,
        price: ad.price,
        priceNegotiable: ad.priceNegotiable,
        description: ad.description,
        dateCreated: ad.dateCreated,
        views: ad.views,
        images,
        category,
        userInfo: {
          name: user.name,
          email: user.email
        },
        stateName: state.name,
        others
      });
    } catch (error) {
      return res.json({ error: 'Produto não encontrado' });
    }
  },
  editAction: async (req, res) => {
    let { id } = req.params;
    let {
      title,
      status,
      price,
      priceNegotiable,
      description,
      category,
      images,
      token
    } = req.body;

    if (id.length < 12) {
      return res.json({ error: 'ID inválido' });
    }

    const ad = await Ad.findById(id).exec();
    if (!ad) {
      return res.json({ error: 'Anúncio inexistente' });
    }

    const user = await User.findOne({ token }).exec();
    if (user._id.toString() !== ad.idUser) {
      return res.json({ error: 'Este anúmcio não é seu' });
    }

    let updates = {};

    if (title) {
      updates.title = title;
    }

    if (price) {
      price = price.replace('.', '').replace(',', '.').replace('R$ ', '');
      price = parseFloat(price);
      updates.price = price;
    }

    if (priceNegotiable) {
      updates.priceNegotiable = priceNegotiable;
    }

    if (status) {
      updates.status = status;
    }

    if (description) {
      updates.description = description;
    }

    if (category) {
      const categoryCheck = await Category.findOne({ slug: category }).exec();
      if (!categoryCheck) {
        return res.json({ error: 'Categoria inexistente' });
      }
      updates.category = categoryCheck._id.toString();
    }

    if (images) {
      updates.images = images;
    }

    await Ad.findByIdAndUpdate(id, { $set: updates });

    if (req.files && req.files.img) {
      const adImage = await Ad.findById(id);

      if (req.files.img.length == undefined) {
        if (
          ['image/jpeg', 'image/jpg', 'image/png'].includes(
            req.files.img.mimetype
          )
        ) {
          let url = await addImage(req.files.img.data);
          adImage.images.push({
            url,
            default: false
          });
        }
      } else {
        for (let i = 0; i < req.files.img.length; i++) {
          if (
            ['image/jpeg', 'image/jpg', 'image/png'].includes(
              req.files.img[i].mimetype
            )
          ) {
            let url = await addImage(req.files.img[i].data);
            adImage.images.push({
              url,
              default: false
            });
          }
        }
      }

      adImage.images = [...adImage.images];
      await adImage.save();
    }

    return res.json({ error: '' });
  }
};
