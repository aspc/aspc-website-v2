import passport from 'passport';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';

interface SamlUser {
  studentId: string;
  email: string;
  name: string;
  role: string;
}


const samlStrategy = new SamlStrategy(
  {
    callbackUrl: 'https://aspc-website-v2.vercel.app/api/auth/saml/callback',
    entryPoint: '', // Your Pomona College SSO entry point URL
    issuer: 'https://aspc-website-v2.vercel.app',
    cert: '', // Your Pomona College IdP certificate
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    acceptedClockSkewMs: -1
  },
  // Sign-in verify callback
  (profile: any, done: any) => {
    const user: SamlUser = {
      studentId: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/studentid'],
      email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
      role: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] || 'user'
    };
    return done(null, user);
  },
  // Logout verify callback
  (profile: any, done: any) => {
    // Handle logout verification
    return done(null, profile);
  }
);



passport.use(samlStrategy);

passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

passport.deserializeUser((user: SamlUser, done: any) => {
  done(null, user);
});
