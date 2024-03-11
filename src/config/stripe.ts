import { SubscriptionPlan } from '@prisma/client';

export const plans = {
  [SubscriptionPlan.DEVELOPER]: {
    maxViews: 0,
  },
  [SubscriptionPlan.HOBBYIST]: {
    maxViews: 0,
  },
  [SubscriptionPlan.INDIE]: {
    maxViews: 0,
  },
  [SubscriptionPlan.STARTUP]: {
    maxViews: 0,
  },
} as const;

export const FREE_PLAN_VIEW_LIMIT = 5_000;
