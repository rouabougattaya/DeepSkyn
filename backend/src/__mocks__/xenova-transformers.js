/**
 * Mock for @xenova/transformers
 * Used in Jest tests to prevent ESM parsing errors
 */

module.exports = {
  pipeline: jest.fn().mockResolvedValue(() => ({
    flagged: false,
    score: 0,
  })),
  AutoTokenizer: jest.fn(),
  AutoModel: jest.fn(),
  transformers: {},
};
