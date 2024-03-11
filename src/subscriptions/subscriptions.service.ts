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

@Injectable()
export class SubscriptionsService {
  stripe: Stripe;

  constructor(
    private readonly dbService: DbService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<Config['stripeSecretKey']>('stripeSecretKey'),
    );
  }

  findSubscriptionByUserId(userId: string) {
    return this.dbService.subscription.findUnique({
      where: { userId },
    });
  }

  async createCheckoutSession(
    userId: string,
    { plan }: CreateCheckoutSessionDto,
  ) {
    const user = await this.usersService.findUnique({
      where: { id: userId },
    });

    const priceId = plans[plan].priceId;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get<Config['frontendUrl']>(
        'frontendUrl',
      )}/pricing/success`,
      cancel_url: `${this.configService.get<Config['frontendUrl']>(
        'frontendUrl',
      )}/pricing`,
      customer_email: user.email,
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
    const priceId = plans[plan].priceId;

    await this.stripe.subscriptions.update(billing.subscriptionId, {
      items: [
        {
          id: subItem,
          price: priceId,
        },
      ],
    });

    return { success: true };
  }
}
