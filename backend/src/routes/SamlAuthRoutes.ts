import { Router } from 'express';
import passport from 'passport';
import { samlStrategy } from '../config/SamlStrategy';
const router = Router();


// Generate SAML metadata
router.get('/metadata', (req, res) => {
  const metadata = samlStrategy.generateServiceProviderMetadata(
    null, 
    null
  );
  res.type('application/xml');
  res.send(metadata);
});

// Initiate SAML login
router.get('/login', 
  passport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// SAML callback endpoint
router.post('/callback',
  passport.authenticate('saml', {
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    res.redirect('/');
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
