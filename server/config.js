module.exports = {
  secret:
    process.env.SECRET,
  firebaseAuthToken:
    process.env.FIREBASE_AUTH_TOKEN,
  apiToken:
    process.env.API_TOKEN,
    awsSecurity: JSON.parse(process.env.AWS_SECURITY),
  awsSecuritySES: JSON.parse(process.env.AWS_SECURITY_SES),
  awsSESConfig: JSON.parse(process.env.SES_CONFIG),
  braintreeConfig: JSON.parse(process.env.BRAINTREE_CONFIG)
};
