import express, { Request, Response } from 'express';
import { initializeSAML, fetchAndSaveMetadata } from '../config/samlConfig';
import fs from 'fs';
import path from 'path';
import { SAMLUser } from '../models/People';
import { Router } from 'express';
import { IdentityProvider } from 'samlify/types/src/entity-idp';
import { ServiceProvider } from 'samlify/types/src/entity-sp';

const router = Router()

let idp: IdentityProvider | undefined;
let sp: ServiceProvider | undefined;

// check if metadata file exists, if not fetch and save it
const metadataPath = path.join(__dirname, '../../idp_metadata.xml');
(!fs.existsSync(metadataPath) 
  ? fetchAndSaveMetadata().then(() => initializeSAML()) 
  : Promise.resolve(initializeSAML())
).then(result => {
  if (result) {
    idp = result.idp;
    sp = result.sp;
  }
});


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
        const baseLink = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';
        // console.log('SAML extract:', extract);
  
        // Store user in session
        (req.session as any).user = {
          id: extract.attributes['http://schemas.microsoft.com/identity/claims/objectidentifier'],
          email: extract.attributes[baseLink + 'emailaddress'],
          firstName: extract.attributes[baseLink + 'givenname'],
          lastName: extract.attributes[baseLink + 'surname'],
          sessionIndex: extract.sessionIndex,
          nameID: extract.nameID
        };
        
        console.log('SAML user:', (req.session as any).user);
        
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            res.status(500).json({ message: 'Failed to save session' });
            return;
          }
          
          // Redirect to your frontend app
          res.redirect(process.env.FRONTEND_LINK || 'http://localhost:3000');
        });
      } catch (error) {
        console.error('SAML consume error:', error);
        res.status(500).json({ message: 'SAML authentication failed', error });
      }
  });

// Logout Route
  router.get('/logout/saml', async (req: Request, res: Response) => {
  try {
    if (!idp || !sp) {
      throw new Error('SAML not initialized');
    }

    const user = (req.session as any).user;
    if (!user) {
      res.redirect('/');
      return;
    }
    console.log('SAML user logged out:', user.nameID);
    const { id, context } = sp.createLogoutRequest(idp, 'redirect', {
      sessionIndex: user.sessionIndex.sessionIndex,
      nameID: user.nameID
    });

    // Clear the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.redirect(process.env.FRONTEND_LINK || context);
    });
  } catch (error) {
    console.error('SAML logout error:', error);
    res.status(500).json({ message: 'Logout failed', error });
  }
});


// Get current user
router.get('/current_user', async (req: Request, res: Response) => {
  if (!(req.session as any).user) {
      res.status(401).json({ message: 'No user is logged in' });
      return;
  }
  const azureId = (req.session as any).user.id;
  let user = await SAMLUser.findOne({ id: azureId });
  if (!user) {
    const userData = {
      id: azureId,
      email: (req.session as any).user.email,
      firstName: (req.session as any).user.firstName,
      lastName: (req.session as any).user.lastName,
      isAdmin: false // TODO: Change based on staff member's emails
    }
    
    const samlUser = new SAMLUser(userData);
    await samlUser.save();
    res.status(200).json({ user: userData });
  }
  res.status(200).json({ user });
});

// All Users
router.get('/users', async (req: Request, res: Response) => {
    try {
      const users = await SAMLUser.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

// -------------------------------------------------------------------------------------------------------


// // Login
// router.post('/login', async (req: Request, res: Response) => {
//     const {email, password} = req.body;
    
//     try {
//         const user = await User.findOne({ email })

//         // Check if the user exists
//         if (!user) {
//             res.status(401).json({ message: 'The user does not exist' });
//             return;
//         }

//         // Check if the passwords match
//         // Note: in production use bcrypt.compare() to compare hashed passwords
//         if (password != user.password) {
//             res.status(401).json({ message: 'Invalid password' });
//             return;
//         }

//         // Save user info in session
//         (req.session as any).user = {
//             email: user.email,
//             name: user.name,
//             isAdmin: user.is_admin,
//         };

//         res.status(200).json({ message: 'Login successful'})

//     } catch (error) {
//         res.status(500).json({ message: 'Server error' });
//     }

//     });

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




export default router;