import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';
import { Config } from 'src/config/config';

export const DbAsyncProvider = 'DbAsyncProvider';

export type Db = NodePgDatabase<typeof schema>;

export const DbProvider = {
  imports: [ConfigModule],
  provide: DbAsyncProvider,
  useFactory: async (configService: ConfigService) => {
    const client = new Client({
      connectionString: configService.get<Config['databaseUrl']>('databaseUrl'),
    });

    await client.connect();

    return drizzle(client, { schema });
  },
  inject: [ConfigService],
  exports: [DbAsyncProvider],
};
