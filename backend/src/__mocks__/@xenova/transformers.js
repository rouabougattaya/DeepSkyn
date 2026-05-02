/**
 * Mock for @xenova/transformers
 * Used in Jest tests to prevent ESM parsing errors
 */

const mockClassifier = jest.fn().mockResolvedValue([
  {
    label: 'safe',
    score: 0.98,
  },
]);

module.exports = {
  pipeline: jest.fn(async () => mockClassifier),
  AutoTokenizer: jest.fn(),
  AutoModel: jest.fn(),
};

// Default export for ES6 imports
module.exports.default = module.exports;
