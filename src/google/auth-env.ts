
// TODO: unused, incomplete -- remove.

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { gapisClientId, gapisClientSecret } from '../config';

const credentials = {
  client_id: gapisClientId,
  client_secret: gapisClientSecret,
};
const oauth2Client = new OAuth2Client(
  credentials.client_id,
  credentials.client_secret,
);

const scopes = ['https://www.googleapis.com/auth/calendar'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});