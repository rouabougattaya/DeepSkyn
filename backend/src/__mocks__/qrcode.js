module.exports = {
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
  toCanvas: jest.fn().mockResolvedValue(null),
  toString: jest.fn().mockResolvedValue('mock qr code string'),
};
