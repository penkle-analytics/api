import { SubscriptionPlan } from '@prisma/client';

export const plans = {
  [SubscriptionPlan.DEVELOPER]: {
    maxViews: 20_000,
  },
  [SubscriptionPlan.HOBBYIST]: {
    maxViews: 50_000,
  },
  [SubscriptionPlan.INDIE]: {
    maxViews: 100_000,
  },
  [SubscriptionPlan.STARTUP]: {
    maxViews: 0,
  },
} as const;

export const FREE_PLAN_VIEW_LIMIT = 5_000;
