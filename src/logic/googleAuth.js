const { OAuth2Client } = require('google-auth-library')
// TODO ENV VAR!!!
const googleClientID = "536166203532-t30d4mei41eujd50df8e5brk4n0o8rn3.apps.googleusercontent.com"
const client = new OAuth2Client(googleClientID)

export async function processGoogleToken(token) {
    if(token) {
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: googleClientID
            });
            const { name, email, picture } = ticket.getPayload();
            const result = {}
            result.name = name
            result.email = email
            return result
        } catch (e) {
            console.error(e)
        }
    }
}

export default processGoogleToken()