import { addRoleHomePage } from 'chaire-lib-backend/lib/services/auth/userPermissions';
import setupRoleDefinition from 'evolution-interviewer/lib/server/services/auth/roleDefinition';

export default () => {
    setupRoleDefinition();

    addRoleHomePage('admin', '/admin');
};
