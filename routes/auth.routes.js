const express = require('express');
const passport = require('passport');

const AuthServices = require('./../services/auth.service');
const service = new AuthServices();

const router = express.Router();

router.post('/login',
  passport.authenticate('local', { session: false }),
  async (req, res, next) => {
    try {
      const user = req.user;
      res.json(service.signToken(user));
    } catch (error) {
      next(error);
    }
  }
);

router.post('/recovery',
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const rta = await service.sendRecovery(email);
      res.json(rta);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/change-password',
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      const rta = await service.changePassword(token, newPassword);
      res.json(rta);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/sign-up',
  async (req, res, next) => {
    try {
      const body = req.body;
      const rta = await service.createUser(body);
      res.status(201).json(rta);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/verify',
  async (req, res, next) => {
    try {
      const { username, code } = req.body;
      const rta = await service.verify(username, code);
      res.json(rta);
    } catch (error) {
      next(error);
    }
  });

module.exports = router;
