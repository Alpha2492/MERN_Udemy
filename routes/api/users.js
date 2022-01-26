const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator'); // make sure user must enter correct data when making request

const User = require('../../models/User');
//

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more charactars'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exisits' }] });
      }

      // Get user gravatar
      const avatar = gravatar.url(email, {
        s: '200', // size
        r: 'pg', // rating (this will avoid NSWF profiles)
        d: 'mm', // default image (like user icon)
      });

      user = new User({
        // creates new user but not save to DB
        name,
        email,
        avatar,
        password,
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10); // does hashing

      user.password = await bcrypt.hash(password, salt);

      //save user
      await user.save();

      // Return jsonwebtoken - front end user get loged in and gets token

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload, // pass in payload
        config.get('jwtSecret'), // pass in secret
        { expiresIn: 360000 }, // add experiation (change to 3600 before deploy)
        (err, token) => {
          if (err) throw err;
          res.json({ token }); // send token back to client
        }
      );

      //res.send('User registered');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
