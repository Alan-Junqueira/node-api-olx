const User = require('../models/User');

module.exports = {
  private: async (req, res, next) => {
    if (!req.query.token && !req.body.token) {
      return res.json({ notAllowed: true });
    }

    let { token } = req.query.token ? req.query : req.body;;

    if (token === '') {
      return res.json({ notAllowed: true });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.json({ notAllowed: true });
    }

    next();
  }
};
