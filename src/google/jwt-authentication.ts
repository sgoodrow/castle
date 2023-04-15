const { JWT } = require('google-auth-library');
const { google}  = require('googleapis');
import { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "../config";

const credentials = {
  client_email: GOOGLE_CLIENT_EMAIL,
  private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const auth = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: 'https://www.googleapis.com/auth/drive',
});

export async function authorize() {
  try {
    await auth.authorize();
  } catch (err) {
    console.error("Authentication failed.")
    throw err;
  }
  return auth;
}
