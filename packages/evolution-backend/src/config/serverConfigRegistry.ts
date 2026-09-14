/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ProjectServerConfig, setProjectConfig } from './projectConfig';

/**
 * Registry of the modules where a survey puts the functions of its server
 * configuration. A survey registers the path of a module instead of the
 * functions it exports, and the server loads them, along with the workers it
 * starts.
 *
 * A function cannot cross the boundary of a worker, so the tasks of the worker
 * pool, the batch audits among them, used to run with the default configuration
 * and audit responses no parser had seen. A path, being data, is sent to a
 * worker, which loads the very modules the server loaded and ends up configured
 * the same way.
 *
 * Registration must happen before the server is set up, since the routes read
 * the configuration as they are mounted. A survey can list every register call
 * as a checklist and give `undefined` for what it does not have, which registers
 * nothing.
 */

// Through `Pick`, a name that is not a field of the project configuration does not compile
type RegistrableServerConfig = keyof Pick<
    ProjectServerConfig,
    | 'surveyObjectParsers'
    | 'serverUpdateCallbacks'
    | 'serverValidations'
    | 'roleDefinitions'
    | 'auditInterview'
    | 'validationListFilter'
>;

export type ServerConfigModulePaths = { [config in RegistrableServerConfig]?: string };

const modulePathByConfig: ServerConfigModulePaths = {};

const register = (config: RegistrableServerConfig, modulePath: string | undefined) => {
    if (modulePath === undefined) {
        return;
    }
    if (modulePath.trim() === '') {
        throw new Error(`The module registered for ${config} is an empty path, use undefined for none`);
    }
    modulePathByConfig[config] = modulePath;
};

/**
 * Register the module whose default export are the parsers that convert the
 * responses of this survey into survey objects.
 *
 * @param {string} [modulePath] Absolute path of the module, as
 * `require.resolve('./parsers')` of the survey gives it, or `undefined` when this
 * survey has none
 */
export const registerSurveyObjectParsersModule = (modulePath: string | undefined) =>
    register('surveyObjectParsers', modulePath);

/**
 * Register the module whose default export are the callbacks run on the server
 * when a field of an interview is updated.
 *
 * @param {string} [modulePath] Absolute path of the module, or `undefined` when
 * this survey has none
 */
export const registerServerUpdateCallbacksModule = (modulePath: string) =>
    register('serverUpdateCallbacks', modulePath);

/**
 * Register the module whose default export are the validations run on the server
 * for the fields of the questionnaire.
 *
 * @param {string} [modulePath] Absolute path of the module, or `undefined` when
 * this survey has none
 */
export const registerServerValidationsModule = (modulePath: string | undefined) =>
    register('serverValidations', modulePath);

/**
 * Register the module whose default export is the function that defines the
 * roles and permissions of this survey.
 *
 * @param {string} [modulePath] Absolute path of the module, or `undefined` when
 * this survey has none
 */
export const registerRoleDefinitionsModule = (modulePath: string | undefined) =>
    register('roleDefinitions', modulePath);

/**
 * Register the module whose default export is the function that audits a whole
 * interview, for a survey that does not use the audits of evolution as they are.
 *
 * @param {string} [modulePath] Absolute path of the module, or `undefined` when
 * this survey has none
 */
export const registerAuditInterviewModule = (modulePath: string | undefined) => register('auditInterview', modulePath);

/**
 * Register the module whose default export is the function that computes the
 * status shown for each interview of the validation list.
 *
 * @param {string} [modulePath] Absolute path of the module, or `undefined` when
 * this survey has none
 */
export const registerValidationListFilterModule = (modulePath: string | undefined) =>
    register('validationListFilter', modulePath);

/**
 * Register a whole configuration at once, as a worker does with the paths its
 * server sends it.
 *
 * @param {ServerConfigModulePaths} modulePaths The module path of each part of
 * the configuration
 */
export const registerServerConfigs = (modulePaths: ServerConfigModulePaths) =>
    Object.entries(modulePaths).forEach(([config, modulePath]) =>
        register(config as RegistrableServerConfig, modulePath)
    );

/**
 * @returns {ServerConfigModulePaths} The registered module paths, to send to the
 * workers of the pool
 */
export const getRegisteredServerConfigs = (): ServerConfigModulePaths => ({ ...modulePathByConfig });

/**
 * Load every registered module and put its default export in the project
 * configuration. Called by the server before it serves anything, and by a worker
 * before it runs a task, so that both read the same configuration.
 *
 * @throws {Error} When a module cannot be loaded or exports nothing, rather than
 * leave the server running with a configuration the survey did not ask for
 */
export const loadRegisteredServerConfig = async (): Promise<void> => {
    for (const [config, modulePath] of Object.entries(modulePathByConfig)) {
        try {
            const configModule = await import(modulePath);
            if (configModule.default === undefined) {
                throw new Error(`The module registered for ${config} has no default export: ${modulePath}`);
            }
            setProjectConfig({ [config]: configModule.default });
        } catch (error) {
            throw new Error(`Error loading the module registered for ${config}: ${error}`);
        }
    }
};
