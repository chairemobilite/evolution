/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from 'chaire-lib-backend/lib/api/auth.routes';
import { IAuthModel, IUserModel } from 'chaire-lib-backend/lib/services/auth/authModel';
import { PassportStatic } from 'passport';
import projectConfig from 'evolution-common/lib/config/project.config';
import { validateCaptchaToken } from 'chaire-lib-backend/lib/api/captcha.routes';

// Setup authentication routes for evolution, in a separate express router. It
// also adds the auth-by-field route if configured
export default <U extends IUserModel>(app: Router, authModel: IAuthModel<U>, passport: PassportStatic) => {
    const router = Router();

    // Add other auth routes
    authRoutes(router, authModel, passport);

    if (projectConfig.auth.byField === true) {
        // For subsequent attempts, validate captcha token
        const captchaMiddleware = validateCaptchaToken({
            // This is not an error message for the user, no need to translate it
            errorMessage: 'Captcha validation required after failed login attempt',
            keepToken: true // Keep the token for to avoid repeated captcha at login in case or errors
        });

        // Middleware to check if captcha is required based on previous failed attempts
        const conditionalCaptchaValidation = async (req: Request, res: Response, next: NextFunction) => {
            // Initialize failed attempts counter in the session if it doesn't exist
            if (!req.session.failedAuthByFieldAttempts) {
                req.session.failedAuthByFieldAttempts = 0;
            }

            // Skip captcha validation for first attempt
            if (req.session.failedAuthByFieldAttempts === 0) {
                return next();
            }
            return captchaMiddleware(req, res, next);
        };

        router.post('/auth-by-field', conditionalCaptchaValidation, (req, res, next) => {
            passport.authenticate('auth-by-field', { session: true }, (err, user) => {
                if (!user) {
                    // Authentication failed
                    req.session.failedAuthByFieldAttempts = (req.session.failedAuthByFieldAttempts || 0) + 1;

                    return res.status(err === 'Unauthorized' ? 401 : 400).json({
                        status: 'User not authenticated',
                        error: err,
                        requiresCaptcha: true
                    });
                }

                // Authentication succeeded, log in user
                req.logIn(user, (loginErr) => {
                    if (loginErr) {
                        return next(loginErr);
                    }

                    // Reset failed attempts counter on successful login
                    req.session.failedAuthByFieldAttempts = 0;

                    return res.status(200).json({
                        user: req.user,
                        status: 'Login successful!'
                    });
                });
            })(req, res, next);
        });
    }

    app.use(router);
};
