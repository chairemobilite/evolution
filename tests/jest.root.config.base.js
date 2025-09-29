module.exports = {
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { 'tsconfig': 'tsconfig.json' }]
    },
    setupFilesAfterEnv: [
        './tests/jestSetup.base.ts'
    ],
    'testEnvironment': 'node',
    preset: 'ts-jest',
    'moduleFileExtensions': [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node'
    ]
};
