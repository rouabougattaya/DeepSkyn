module.exports = {
  generateSecret: jest.fn(() => 'MOCK_SECRET_KEY'),
  generateURI: jest.fn(() => 'otpauth://totp/MockApp?secret=MOCK_SECRET_KEY'),
  verifySync: jest.fn((token, secret) => true),
  authenticator: {
    generateSecret: jest.fn(() => 'MOCK_SECRET_KEY'),
    keyuri: jest.fn(() => 'otpauth://totp/MockApp?secret=MOCK_SECRET_KEY'),
    verify: jest.fn((token, secret) => true),
  },
};
