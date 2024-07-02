module.exports = {
  "testEnvironment": "node",
  "snapshotSerializers": [
    "enzyme-to-json/serializer"
  ],
  "testPathIgnorePatterns": ["src/tests/sequential", "src/tests/ui"],
  "transform": {
    '^.+\\.jsx?$': 'babel-jest',
  },
  "automock": false,
  "setupFiles": [
    "<rootDir>/src/tests/setupTests.js",
    "raf/polyfill"
  ],
  "globalSetup": "<rootDir>/src/tests/globalSetup.js",
  "globalTeardown": "<rootDir>/src/tests/globalTeardown.js",
  "moduleNameMapper": {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  }
};