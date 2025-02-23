import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { IdentityProvider, ServiceProvider } from 'samlify';
import dotenv from 'dotenv';
dotenv.config();
import * as samlify from 'samlify';
import * as validator from '@authenio/samlify-node-xmllint';


samlify.setSchemaValidator(validator);

export const fetchAndSaveMetadata = async () => {
  const metadataUrl = process.env.IDP_METADATA_URL;
  if (!metadataUrl) {
    console.error('IDP_METADATA_URL not found in environment variables');
    return null;
  }
  
  try {
    const response = await axios.get(metadataUrl);
    const metadataPath = path.join(__dirname, '../../idp_metadata.xml');
    fs.writeFileSync(metadataPath, response.data);
    console.log('Metadata saved successfully');
    return metadataPath;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    throw error;
  }
};


  export const serverConfig = {
    port: process.env.PORT || 5000,
    httpsOptions: {
      key: fs.readFileSync(path.join(__dirname, '../../certs/localhost.key')),
      cert: fs.readFileSync(path.join(__dirname, '../../certs/localhost.crt'))
    }
  };

  export const initializeSAML = () => {
    try {  
      const idp = IdentityProvider({
        metadata: fs.readFileSync(path.join(__dirname, '../../idp_metadata.xml')),
        wantAuthnRequestsSigned: true
      });
  
      const sp = ServiceProvider({
        entityID: 'https://aspc-website-v2.vercel.app',
        assertionConsumerService: [{
          Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          Location: `${process.env.NODE_ENV === 'development' 
            ? 'https://localhost:5000'
            : 'https://aspc-website-v2.vercel.app'}/api/auth/saml/consume`
        }]
      });
  
      return { idp, sp };
    } catch (error) {
      console.error('SAML initialization error:', error);
      return null;
    }
  };