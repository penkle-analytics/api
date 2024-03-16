import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import {
  user as userSchema,
  domain as domainSchema,
  event as eventSchema,
} from './schema';
import { hash } from 'argon2';
import dayjs from 'dayjs';
import { createId } from '@paralleldrive/cuid2';

const client = new Client({
  connectionString: process.env.DATABASE_URL!,
});

const db = drizzle(client, { schema });

const domains = ['penkle.com'];

const MAX_EVENTS = 100000;

async function generateEvents() {
  const fixedUniqueVisitorIds = Array.from({ length: 100 }, () =>
    Math.random().toString(36).substring(7),
  );

  const countries = {
    US: 'United States',
    UK: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    JP: 'Japan',
    BR: 'Brazil',
    MX: 'Mexico',
    IN: 'India',
    CN: 'China',
    KR: 'South Korea',
    RU: 'Russia',
  };
  const os = ['Windows', 'MacOS', 'Linux', 'iOS', 'Android'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
  const href = [
    '/',
    '/about',
    '/home',
    '/contact',
    '/login',
    '/signup',
    '/terms',
  ];

  const uniqueVisitorIds = Array.from({ length: MAX_EVENTS }, () =>
    Math.random() > 0.666
      ? fixedUniqueVisitorIds[
          Math.floor(Math.random() * fixedUniqueVisitorIds.length)
        ]
      : Math.random().toString(36).substring(7),
  );

  const countryCode =
    Object.keys(countries)[
      Math.floor(Math.random() * Object.keys(countries).length)
    ];

  const country = countries[countryCode];

  return uniqueVisitorIds.map((uniqueVisitorId) => ({
    uniqueVisitorId,
    countryCode,
    country,
    os: os[Math.floor(Math.random() * os.length)],
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    href: `https://${domains[Math.floor(Math.random() * domains.length)]}${
      href[Math.floor(Math.random() * href.length)]
    }`,
  }));
}

(async () => {
  console.log(createId());

  await client.connect();

  // Create a test user
  const [user] = await db
    .insert(userSchema)
    .values({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@gmail.com',
      password: await hash('password'),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning();

  const domainIds = [];

  // Create a test domain
  for await (const domain of domains) {
    const returnedDomain = await db
      .insert(domainSchema)
      .values({
        name: domain,
        updatedAt: new Date().toISOString(),
      })
      .returning();

    domainIds.push(returnedDomain[0].id);
  }

  // Link the user to the domain
  for await (const domainId of domainIds) {
    await db.insert(schema.userDomain).values({
      userId: user.id,
      domainId,
      updatedAt: new Date().toISOString(),
    });
  }

  let i = 0;

  for await (const data of await generateEvents()) {
    console.log(`Inserting event ${i++} of ${MAX_EVENTS}...`);

    await db
      .insert(eventSchema)
      .values({
        ...data,
        type: 'PAGE_VIEW',
        updatedAt: new Date().toISOString(),
        createdAt: dayjs()
          .subtract(Math.floor(Math.random() * 100), 'days')
          .toISOString(),
        domainId: domainIds[Math.floor(Math.random() * domainIds.length)],
      })
      .returning();

    if (i === MAX_EVENTS) {
      break;
    }

    i++;
  }

  await client.end();
})();
