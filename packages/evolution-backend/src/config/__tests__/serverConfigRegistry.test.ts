/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { SurveyObjectParsers } from '../../services/audits/types';

const registeredModule = require.resolve('./fixtures/registeredServerConfig');
const moduleWithoutDefaultExport = require.resolve('./fixtures/serverConfigWithoutDefaultExport');

/**
 * The registry and the project configuration both keep state for the whole life
 * of a server, so each test gets its own instance of them
 */
const freshModules = () => {
    let modules: {
        registry: typeof import('../serverConfigRegistry');
        projectConfig: typeof import('../projectConfig');
    };
    jest.isolateModules(() => {
        modules = {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            registry: require('../serverConfigRegistry'),
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            projectConfig: require('../projectConfig')
        };
    });
    return modules!;
};

describe('register', () => {
    // Each named function registers the module of the part of the configuration it names
    test.each([
        { registerFunction: 'registerSurveyObjectParsersModule', config: 'surveyObjectParsers' },
        { registerFunction: 'registerServerUpdateCallbacksModule', config: 'serverUpdateCallbacks' },
        { registerFunction: 'registerServerValidationsModule', config: 'serverValidations' },
        { registerFunction: 'registerRoleDefinitionsModule', config: 'roleDefinitions' },
        { registerFunction: 'registerAuditInterviewModule', config: 'auditInterview' },
        { registerFunction: 'registerValidationListFilterModule', config: 'validationListFilter' }
    ])('$registerFunction registers the module under $config', ({ registerFunction, config }) => {
        const { registry } = freshModules();
        registry[registerFunction](registeredModule);
        expect(registry.getRegisteredServerConfigs()).toEqual({ [config]: registeredModule });
    });

    test('registers a whole configuration at once, as a worker does', () => {
        const { registry } = freshModules();
        const modulePaths = { surveyObjectParsers: registeredModule, serverValidations: registeredModule };
        registry.registerServerConfigs(modulePaths);
        expect(registry.getRegisteredServerConfigs()).toEqual(modulePaths);
    });

    // A survey keeps the whole list of register calls as a checklist, with
    // `undefined` for what it does not configure
    test('registers nothing for undefined', () => {
        const { registry } = freshModules();
        registry.registerSurveyObjectParsersModule(undefined);
        expect(registry.getRegisteredServerConfigs()).toEqual({});
    });

    // An empty path would only fail later, when nothing could be loaded from it
    test.each([{ modulePath: '' }, { modulePath: '   ' }])(
        'refuses the empty path "$modulePath"',
        ({ modulePath }) => {
            const { registry } = freshModules();
            expect(() => registry.registerSurveyObjectParsersModule(modulePath)).toThrow(
                'The module registered for surveyObjectParsers is an empty path, use undefined for none'
            );
        }
    );

    test('registers nothing when the survey registers nothing', () => {
        const { registry } = freshModules();
        expect(registry.getRegisteredServerConfigs()).toEqual({});
    });
});

describe('loadRegisteredServerConfig', () => {
    test('puts what a registered module exports in the project configuration', async () => {
        const { registry, projectConfig } = freshModules();
        registry.registerSurveyObjectParsersModule(registeredModule);

        await registry.loadRegisteredServerConfig();

        // The parser of the fixture marks the person it receives
        const person = projectConfig.default.surveyObjectParsers!.person!({} as ExtendedPersonAttributes, {});
        expect(person).toEqual({ _parsed: true });
    });

    test('leaves the configuration alone when nothing is registered', async () => {
        const { registry, projectConfig } = freshModules();
        const parsers: SurveyObjectParsers = { person: (personAttributes) => personAttributes };
        projectConfig.setProjectConfig({ surveyObjectParsers: parsers });

        await registry.loadRegisteredServerConfig();

        expect(projectConfig.default.surveyObjectParsers).toBe(parsers);
    });

    // A server left running with the default configuration audits and validates
    // differently than the survey asked for, so loading rather fails
    test('fails when a registered module has no default export', async () => {
        const { registry } = freshModules();
        registry.registerSurveyObjectParsersModule(moduleWithoutDefaultExport);

        await expect(registry.loadRegisteredServerConfig()).rejects.toThrow(
            `The module registered for surveyObjectParsers has no default export: ${moduleWithoutDefaultExport}`
        );
    });

    test('fails when a registered module cannot be found', async () => {
        const { registry } = freshModules();
        registry.registerSurveyObjectParsersModule('/survey/lib/server/thereIsNoSuchModule.js');

        await expect(registry.loadRegisteredServerConfig()).rejects.toThrow();
    });
});
