import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config';
import { DbService } from 'src/db/db.service';
import { UsersService } from 'src/users/users.service';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session';
import { plans } from 'src/config/stripe';
import { CreateBillingPortalSessionDto } from './dto/create-billing-portal-session.dto';
import { ChangeSubscriptionPlanDto } from './dto/change-subscription-plan.dto';
import { DomainsService } from 'src/domains/domains.service';
import { Prisma, SubscriptionPlan, UserDomain } from '@prisma/client';

type DomainWithUserDomain = Prisma.DomainGetPayload<{
  include: { users: true };
}>;

const freePlan = {
  name: 'Free',
  plan: 'FREE',
  priceId: null,
  price: 0,
  description: 'We all start somewhere.',
  events: 5_000,
  features: [
    'Up to 5k Monthly Events',
    'Unlimited Domains',
    'GDPR Compliance',
    '100% Data Ownership',
    '2 Years Data Retention',
    'Basic Support',
  ],
};

export const paidPlansMetadata = [
  {
    plan: SubscriptionPlan.DEVELOPER,
    description: "Maybe I'm onto something here...",
    events: 50_000,
    features: [
      'Up to 50k Monthly Events',
      'Unlimited Domains',
      'GDPR Compliance',
      '100% Data Ownership',
      '3 Years Data Retention',
      'Priority Support',
    ],
  },
  {
    plan: SubscriptionPlan.HOBBYIST,
    description: 'How do I make this my full-time job?',
    events: 100_000,
    features: [
      'Up to 100k Monthly Events',
      'Unlimited Domains',
      'GDPR Compliance',
      '100% Data Ownership',
      '4 Years Data Retention',
      'Priority Support',
    ],
  },
  {
    plan: SubscriptionPlan.INDIE,
    description: 'Look ma, I made it!',
    events: 500_000,
    features: [
      'Up to 500k Monthly Events',
      'Unlimited Domains',
      'GDPR Compliance',
      '100% Data Ownership',
      '5 Years Data Retention',
      'Dedicated Support',
    ],
  },
  {
    plan: SubscriptionPlan.STARTUP,
    description: "I'm the next Google!",
    events: 1_000_000,
    features: [
      'Up to 1M Monthly Events',
      'Unlimited Domains',
      'GDPR Compliance',
      '100% Data Ownership',
      '5 Years Data Retention',
      'Dedicated Support',
    ],
  },
];

type GetSubscriptions = {
  includeFree?: boolean;
};

@Injectable()
export class SubscriptionsService {
  stripe: Stripe;

  constructor(
    private readonly dbService: DbService,
    private readonly usersService: UsersService,
    private readonly domainsService: DomainsService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<Config['stripeSecretKey']>('stripeSecretKey'),
    );
  }

  async getSubscriptions(opts: GetSubscriptions = {}) {
    const products = await this.stripe.products.list({
      active: true,
    });

    const prices = await this.stripe.prices.list({
      active: true,
    });

    const paidPlans = products.data.map((product) => {
      const price = prices.data.find((price) => price.product === product.id);
      const metadata = paidPlansMetadata.find(
        (p) => p.plan === product.metadata['plan'],
      );

      return {
        name: product.name,
        plan: product.name,
        priceId: price.id,
        price: price.unit_amount / 100,
        ...metadata,
      };
    });

    return [
      ...(opts.includeFree ? [freePlan] : []),
      ...paidPlans.sort((a, b) => a.price - b.price),
    ];
  }

  findSubscriptionByUserId(userId: string) {
    return this.dbService.subscription.findUnique({
      where: { userId },
    });
  }

  async findSubscriptionByDomain(name: string) {
    const user = await this.dbService.userDomain.findFirst({
      where: {
        role: 'OWNER',
        domain: {
          name,
        },
      },
    });

    return this.dbService.subscription.findUnique({
      where: { userId: user.userId },
    });
  }

  async createCheckoutSession(
    userId: string,
    { plan }: CreateCheckoutSessionDto,
  ) {
    const user = await this.usersService.findUnique({
      where: { id: userId },
    });

    const discounts = [];

    if (user.email.endsWith('@student.42.fr')) {
      discounts.push({
        coupon:
          this.configService.get<Config['stripePromo42']>('stripePromo42'),
      });
    }

    const subscriptions = await this.getSubscriptions();
    const priceId = subscriptions.find((s) => s.plan === plan).priceId;

    console.log('Initiating checkout session', {
      user,
      plan,
      priceId,
      discounts,
    });

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId as string,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get<Config['frontendUrl']>(
        'frontendUrl',
      )}/dashboard/settings?action=sub`,
      cancel_url: `${this.configService.get<Config['frontendUrl']>(
        'frontendUrl',
      )}/pricing`,
      customer_email: user.email,
      discounts,
      ...(discounts.length === 0 && {
        allow_promotion_codes: true,
      }),
    });

    return {
      url: session.url,
    };
  }

  async createBillingPortalSession(
    userId: string,
    { redirectUrl }: CreateBillingPortalSessionDto,
  ) {
    const billing = await this.dbService.subscription.findUnique({
      where: { userId },
    });

    redirectUrl ||=
      this.configService.get<Config['frontendUrl']>('frontendUrl');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: billing.customerId,
      return_url: redirectUrl,
    });

    return {
      url: session.url,
    };
  }

  async unsubscribe(userId: string) {
    const billing = await this.dbService.subscription.findUnique({
      where: { userId },
    });

    await this.stripe.subscriptions.update(billing.subscriptionId, {
      cancel_at_period_end: true,
    });

    return { success: true };
  }

  async resubscribe(userId: string) {
    const billing = await this.dbService.subscription.findUnique({
      where: { userId },
    });

    await this.stripe.subscriptions.update(billing.subscriptionId, {
      cancel_at_period_end: false,
    });

    return { success: true };
  }

  async changeSubscriptionPlan(
    userId: string,
    { plan }: ChangeSubscriptionPlanDto,
  ) {
    const billing = await this.dbService.subscription.findUnique({
      where: { userId },
    });
    const subscription = await this.stripe.subscriptions.retrieve(
      billing.subscriptionId,
    );
    const subItem = subscription.items.data[0].id;
    const subscriptions = await this.getSubscriptions();
    const priceId = subscriptions.find((s) => s.plan === plan).priceId;

    await this.stripe.subscriptions.update(billing.subscriptionId, {
      items: [
        {
          id: subItem,
          price: priceId as string,
        },
      ],
    });

    return { success: true };
  }
}
