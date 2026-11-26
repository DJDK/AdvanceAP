export const {
  VITE_AUTH0_DOMAIN: domain,
  VITE_AUTH0_AUDIENCE: audience,
  MONGODB_URI: mongoUri,
  MONGODB_DATABASE: database = 'ap_practice',
  API_PORT = '3001',
  ADMIN_AUTH0_SUB: bootstrapId,
  EXAM_DURATION_SECONDS = '7200',
} = process.env

export const duration = Number(EXAM_DURATION_SECONDS)
if (!domain || !audience || !mongoUri || !Number.isSafeInteger(duration) || duration < 1 || duration > 86400) {
  throw new Error('Set the Auth0 and MongoDB variables and a valid exam duration in .env. See README.md.')
}
