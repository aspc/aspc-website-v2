import express, { Request, Response } from 'express';
import User from '../models/User';
import { initializeSAML } from '../config/samlConfig';
import { Router } from 'express';

const router = Router()
const { idp, sp } = initializeSAML() || {};


// Test SAML metadata route
router.get('/test-saml-metadata', async (req: Request, res: Response) => {
    try {
      if (!idp || !sp) {
        res.status(500).json({ message: 'SAML not initialized' });
        return;
      }
      
      res.json({
        idpMetadata: idp.getMetadata(),
        spMetadata: sp.getMetadata()
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching SAML metadata', error });
    }
});

// SAML login initiation
router.get('/login/saml', async (req: Request, res: Response) => {
    try {
      if (!idp || !sp) {
        res.status(500).json({ message: 'SAML not initialized' });
        return;
      }
      const { id, context } = sp.createLoginRequest(idp, 'redirect');
      (req.session as any).authRequest = id;
      res.redirect(context);
    } catch (error) {
      res.status(500).json({ message: 'SAML login error', error });
    }
  });
  
  // SAML assertion consumer service
  router.post('/saml/consume', 
    express.urlencoded({ extended: false }), 
    async (req: Request, res: Response) => {
      try {
        if (!idp || !sp) {
          res.status(500).json({ message: 'SAML not initialized' });
          return;
        }
        
        const { extract } = await sp.parseLoginResponse(idp, 'post', req);
        console.log('SAML Response:', extract);
  
        // Store user in session
        (req.session as any).user = {
          email: extract.attributes.emailaddress,
          name: extract.attributes.name,
          firstName: extract.attributes.givenname,
          lastName: extract.attributes.surname
        };
  
        res.redirect('/');
      } catch (error) {
        console.error('SAML consume error:', error);
        res.status(500).json({ message: 'SAML authentication failed', error });
      }
  });

// All Users
router.get('/', async (req: Request, res: Response) => {
    try {
      const users = await User.find().select('-password'); // Exclude password field
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

// Login
router.post('/login', async (req: Request, res: Response) => {
    const {email, password} = req.body;
    
    try {
        const user = await User.findOne({ email })

        // Check if the user exists
        if (!user) {
            res.status(401).json({ message: 'The user does not exist' });
            return;
        }

        // Check if the passwords match
        // Note: in production use bcrypt.compare() to compare hashed passwords
        if (password != user.password) {
            res.status(401).json({ message: 'Invalid password' });
            return;
        }

        // Save user info in session
        (req.session as any).user = {
            email: user.email,
            name: user.name,
            isAdmin: user.is_admin
        };

        res.status(200).json({ message: 'Login successful'})

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }

    });

// Logout
router.post('/logout', async (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                res.status(500).json({ message: 'Unable to log out' });
            } else {
                res.status(200).json({ message: 'Logout successful' });
            }
        })
    } else {
        res.status(400).json({ message: 'You are already logged out'});
    };

});


// Get current user
router.get('/current_user', async (req: Request, res: Response) => {
    if (!(req.session as any).user) {
        res.status(401).json({ message: 'No user is logged in' });
        return;
    }

    res.status(200).json({ user: (req.session as any).user })
});

export default router;