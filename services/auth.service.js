const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
//const nodemailer = require('nodemailer');
const { config } = require('./../config/config');
const { sendEmail } = require('./../utils/helpers/send.helper');

const UserServices = require('./user.service');
const service = new UserServices();

class AuthServices {
  constructor() { }

  async getUser(username, password) {
    const user = await service.findByUsername(username);
    if (!user) {
      throw boom.unauthorized();
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw boom.unauthorized();
    }
    delete user.dataValues.password;
    delete user.dataValues.recoveryToken;
    return user;
  }

  signToken(user) {
    const payload = {
      sub: user.id,
      role: user.role
    }
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '10h' });
    return {
      user,
      token
    };
  }

  async sendRecovery(email) {

    const user = await service.findByEmail(email);
    if (!user) {
      throw boom.unauthorized();
    }
    const payload = { sub: user.id };
    const token = jwt.sign(payload, config.jwtRecoverySecret, { expiresIn: '10min' });
    const link = `https://mydomain.com/recovery?token=${token}`;
    await service.update(user.id, { recoveryToken: token });
    const mail = {
      from: 'hpereira@sofycode.com', // sender address
      to: `${user.email}`, // list of receivers
      subject: 'Recuperar contraseña', // Subject line
      html: `<b>Ingresa a este link => ${link} </b>`, // html body
    }
    const rta = await sendEmail(mail);
    return rta;

  }

  async changePassword(token, newPassword) {
    try {
      const payload = jwt.verify(token, config.jwtRecoverySecret);
      const user = await service.findOne(payload.sub);
      if (user.recoveryToken !== token) {
        throw boom.unauthorized();
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await service.update(user.id, { recoveryToken: null, password: hash });
      return { message: 'password changed' }
    } catch (error) {
      throw boom.unauthorized();
    }
  }

  // async sendEmail(info) {

  //   const transporter = nodemailer.createTransport({
  //     host: config.smtpHost,
  //     secure: true, // true for 465, false for other ports
  //     port: config.smtpPort,
  //     auth: {
  //       user: config.smtpUsername,
  //       pass: config.smtpPassword
  //     }
  //   });
  //   await transporter.sendMail(info);
  //   return { message: 'email sent' }

  // }

  async createUser(data) {
    const findUser = await service.findByUsername(data.username);
    if (findUser) {
      throw boom.unauthorized('user exists');
    }
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    data.verifyCode = randomCode;
    const newUser = await service.create(data);
    if (!newUser) {
      throw boom.badRequest('register failed');
    }
    const info = {
      from: 'hpereira@sofycode.com',
      to: `${newUser.dataValues.email}`,
      subject: 'Activación de cuenta',
      html: `<p>El código de verificación es: ${newUser.dataValues.verifyCode}</p>`,
    }
    const email = await sendEmail(info);
    return {
      newUser,
      email
    };
  }

  async verify(username, code) {
    const user = await service.findByUsernameToVerify(username);
    if (!user) {
      throw boom.notFound();
    }
    if (user.verifyCode !== code) {
      throw boom.unauthorized();
    }
    const rta = await service.update(user.id, { verifyCode: null, active: true });
    return rta;
  }
}

module.exports = AuthServices;
