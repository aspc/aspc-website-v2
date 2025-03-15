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
      if (typeof document !== 'undefined' && document.hasStorageAccess) {
        const hasAccess = await document.hasStorageAccess();
        if (!hasAccess) {
          // Request storage access if not available
          await document.requestStorageAccess();
        }
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

  router.get('/check-storage-access', (req: Request, res: Response) => {
    res.json({
      hasStorageAccess: typeof document !== 'undefined' && !!document.hasStorageAccess,
      instructions: "Call document.requestStorageAccess() if needed"
    });
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
  } else {
    res.status(200).json({ user });
  }
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




// Debug route for session and cookie troubleshooting
router.get('/debug-session', (req: Request, res: Response) => {
  // Extract browser information
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isMobile = /iPhone|iPad|iPod/.test(userAgent);
  
  // Get session information
  const sessionExists = !!req.session.id;
  const user = (req.session as any).user;
  
  // Get request details
  const protocol = req.protocol;
  const host = req.headers.host;
  const origin = req.headers.origin;
  
  // Test setting a diagnostic cookie
  res.cookie('debug_test', 'safari_test', {
    secure: true,
    sameSite: 'none',
    httpOnly: false, // So it's visible in browser dev tools
    maxAge: 5 * 60 * 1000 // 5 minutes
  });
  
  // Log useful information
  console.log(`[DEBUG] Session debug requested from ${isSafari ? 'Safari' : 'other browser'}`, {
    sessionID: req.session.id || 'No session ID',
    hasUser: !!user,
    cookies: req.headers.cookie ? 'Present' : 'Not present',
    userAgent
  });
  
  // Return detailed debug information
  res.json({
    timestamp: new Date().toISOString(),
    browser: {
      userAgent,
      isSafari,
      isMobile
    },
    request: {
      protocol,
      host,
      origin,
      ip: req.ip,
      headers: {
        cookie: req.headers.cookie ? 'Present (not shown)' : 'Not present',
        referer: req.headers.referer || 'Not set'
      }
    },
    session: {
      exists: sessionExists,
      id: req.session.id || 'Not set',
      user: user ? {
        present: true,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      } : 'Not set',
      cookie: req.session.cookie ? {
        maxAge: req.session.cookie.maxAge,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        sameSite: req.session.cookie.sameSite,
        domain: req.session.cookie.domain || 'Not set',
        path: req.session.cookie.path || 'Not set'
      } : 'Not available'
    },
    instructions: {
      safari: "Check if the debug_test cookie appears in Safari's developer tools.",
      checkCookies: "In Safari, go to Preferences > Privacy > Cookies and Website Data and ensure 'Block all cookies' is not selected.",
      nextSteps: "If session exists but user data is missing, check SAML assertion. If no session exists, check cookie settings."
    }
  });
});

export default router;