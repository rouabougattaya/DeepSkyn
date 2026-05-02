module.exports = {
  bytesToHex: jest.fn((bytes) => bytes.toString('hex')),
  hexToBytes: jest.fn((hex) => Buffer.from(hex, 'hex')),
};
