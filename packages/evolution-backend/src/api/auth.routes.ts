/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Router, Request, Response } from 'express';
import authRoutes from 'chaire-lib-backend/lib/api/auth.routes';
import { IAuthModel, IUserModel } from 'chaire-lib-backend/lib/services/auth/authModel';
import { PassportStatic } from 'passport';
import projectConfig from 'evolution-common/lib/config/project.config';

// Setup authentication routes for evolution, in a separate express router. It
// also adds the auth-by-field route if configured
export default <U extends IUserModel>(app: Router, authModel: IAuthModel<U>, passport: PassportStatic) => {
    const router = Router();

    // Add other auth routes
    authRoutes(router, authModel, passport);

    if (projectConfig.auth.byField === true) {
        router.post(
            '/auth-by-field',
            passport.authenticate('auth-by-field'),
            (req, res) => {
                return res.status(200).json({
                    user: req.user,
                    status: 'Login successful!'
                });
            },
            (err, _req: Request, res: Response, _next) => {
                // Handle error
                if (!res.statusCode) {
                    res.status(200);
                }
                return res.json({
                    error: err,
                    status: 'User not authenticated'
                });
            }
        );
    }

    app.use(router);
};
