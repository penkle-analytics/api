import {
  pgTable,
  uniqueIndex,
  foreignKey,
  pgEnum,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const eventType = pgEnum('EventType', ['PAGE_VIEW']);
export const subscriptionPlan = pgEnum('SubscriptionPlan', [
  'STARTUP',
  'INDIE',
  'HOBBYIST',
  'DEVELOPER',
]);
export const subscriptionStatus = pgEnum('SubscriptionStatus', [
  'PAUSED',
  'CANCELLED',
  'TRIALING',
  'ACTIVE',
]);

export const userDomain = pgTable(
  'UserDomain',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId())
      .notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    domainId: text('domainId')
      .notNull()
      .references(() => domain.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => {
    return {
      userIdDomainIdKey: uniqueIndex('UserDomain_userId_domainId_key').on(
        table.userId,
        table.domainId,
      ),
    };
  },
);

export const waitlistUser = pgTable(
  'WaitlistUser',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId())
      .notNull(),
    email: text('email').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => {
    return {
      emailKey: uniqueIndex('WaitlistUser_email_key').on(table.email),
    };
  },
);

export const prismaMigrations = pgTable('_prisma_migrations', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  logs: text('logs'),
  rolledBackAt: timestamp('rolled_back_at', {
    withTimezone: true,
    mode: 'string',
  }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  appliedStepsCount: integer('applied_steps_count').default(0).notNull(),
});

export const domain = pgTable(
  'Domain',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId())
      .notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => {
    return {
      nameKey: uniqueIndex('Domain_name_key').on(table.name),
    };
  },
);

export const event = pgTable('Event', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId())
    .notNull(),
  type: eventType('type').notNull(),
  href: text('href').notNull(),
  referrer: text('referrer'),
  country: text('country').notNull(),
  browser: text('browser').notNull(),
  os: text('os').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
  domainId: text('domainId')
    .notNull()
    .references(() => domain.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  countryCode: text('countryCode').notNull(),
  uniqueVisitorId: text('uniqueVisitorId'),
  sessionId: text('sessionId').references(() => session.id, {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }),
});

export const session = pgTable('Session', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId())
    .notNull(),
  uniqueVisitorId: text('uniqueVisitorId').notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
  domainId: text('domainId')
    .notNull()
    .references(() => domain.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
});

export const user = pgTable(
  'User',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId())
      .notNull(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    firstName: text('firstName').notNull(),
    lastName: text('lastName').notNull(),
  },
  (table) => {
    return {
      emailKey: uniqueIndex('User_email_key').on(table.email),
    };
  },
);

export const subscription = pgTable(
  'Subscription',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId())
      .notNull(),
    subscriptionId: text('subscriptionId').notNull(),
    subscriptionPlan: subscriptionPlan('subscriptionPlan').notNull(),
    subscriptionStatus: subscriptionStatus('subscriptionStatus').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    customerId: text('customerId').notNull(),
    productId: text('productId').notNull(),
    periodEndsAt: timestamp('periodEndsAt', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').default(false).notNull(),
  },
  (table) => {
    return {
      userIdKey: uniqueIndex('Subscription_userId_key').on(table.userId),
      subscriptionIdKey: uniqueIndex('Subscription_subscriptionId_key').on(
        table.subscriptionId,
      ),
      customerIdKey: uniqueIndex('Subscription_customerId_key').on(
        table.customerId,
      ),
      productIdKey: uniqueIndex('Subscription_productId_key').on(
        table.productId,
      ),
    };
  },
);

export const usersRelations = relations(user, ({ many }) => ({
  domains: many(userDomain),
}));

export const domainsRelation = relations(domain, ({ many }) => ({
  events: many(event),
  users: many(userDomain),
  sessions: many(session),
}));

export const eventsRelation = relations(event, ({ one }) => ({
  domain: one(domain, {
    fields: [event.domainId],
    references: [domain.id],
  }),
  session: one(session, {
    fields: [event.sessionId],
    references: [session.id],
  }),
}));

export const sessionsRelation = relations(session, ({ many, one }) => ({
  events: many(event),
  domain: one(domain, {
    fields: [session.domainId],
    references: [domain.id],
  }),
}));

export const userDomainsRelation = relations(userDomain, ({ one }) => ({
  user: one(user, {
    fields: [userDomain.userId],
    references: [user.id],
  }),
  domain: one(domain, {
    fields: [userDomain.domainId],
    references: [domain.id],
  }),
}));

export const subscriptionsRelation = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));
