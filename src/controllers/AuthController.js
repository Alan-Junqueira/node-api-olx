const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { validationResult, matchedData } = require('express-validator');

const User = require('../models/User');
const State = require('../models/State');

module.exports = {
  signin: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ error: errors.mapped() });
    }

    const data = matchedData(req);

    const user = await User.findOne({ email: data.email });

    if (!user) {
      return res.json({ error: 'E-mail e/ou senha inválidos!' });
    }

    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) {
      return res.json({ error: 'E-mail e/ou senha inválidos!' });
    }

    const payload = (Date.now() + Math.random()).toString();
    const token = await bcrypt.hash(payload, 10);

    user.token = token;
    await user.save();

    return res.json({ token, email: data.email });
  },
  signup: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ error: errors.mapped() });
    }

    const data = matchedData(req);

    //* Verify e-mail
    const user = await User.findOne({ email: data.email });
    if (user) {
      return res.json({ error: { email: { msg: 'E-mail já existe' } } });
    }

    //* Verify state
    if (mongoose.Types.ObjectId.isValid(data.state)) {
      const stateIten = await State.findById(data.state);
      if (!stateIten) {
        return res.json({ error: { state: { msg: 'Estado não existe' } } });
      }
    } else {
      return res.json({
        error: { state: { msg: 'Código de estado inválido' } }
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const payload = (Date.now() + Math.random()).toString();
    const token = await bcrypt.hash(payload, 10);

    const newUser = new User({
      name: data.name,
      email: data.email,
      passwordHash,
      token,
      state: data.state
    });

    await newUser.save();

    return res.json({ token });
  }
};
