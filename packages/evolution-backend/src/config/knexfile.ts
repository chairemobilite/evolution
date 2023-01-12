import libKnex, { onUpdateTrigger } from 'chaire-lib-backend/lib/config/knexfile';

export { onUpdateTrigger };

export default Object.assign({}, libKnex, {
    migrations: {
        directory: __dirname + '/../models/migrations',
        tableName: 'knex_migrations_evolution',
        loadExtensions: ['.js']
    }
});
