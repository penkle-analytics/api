import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import * as dayjs from 'dayjs';
import { Config } from 'src/config/config';
import { DbService } from 'src/db/db.service';
import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  stripe: Stripe;

  constructor(
    private readonly dbService: DbService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      configService.get<Config['stripeSecretKey']>('stripeSecretKey'),
    );
  }

  /**
   * Sent when the subscription is created.
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      const customer = await this.stripe.customers.retrieve(
        subscription.customer as string,
      );

      const email = customer['email'];

      if (!email) {
        console.error('No email found for customer');

        return;
      }

      const product = await this.stripe.products.retrieve(
        subscription.items.data[0].plan.product as string,
      );

      const subscriptionPlan = product.metadata['plan'] as SubscriptionPlan;

      const user = await this.dbService.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.error('No user found for email');

        return;
      }

      console.log(
        'Subscription created',
        JSON.stringify(subscription, null, 2),
      );

      await this.dbService.subscription.create({
        data: {
          subscriptionId: subscription.id,
          customerId: customer.id,
          productId: product.id,
          status:
            subscription.status === 'trialing'
              ? SubscriptionStatus.TRIALING
              : SubscriptionStatus.ACTIVE,
          plan: subscriptionPlan,
          periodEndsAt: dayjs.unix(subscription.current_period_end).toDate(),
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error handling subscription created', error);
    }
  }

  /**
   * Sent when a customer’s subscription ends.
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const subscriptionId = subscription.id;

      const subscriptionRecord = await this.dbService.subscription.findUnique({
        where: { subscriptionId },
      });

      if (!subscriptionRecord) {
        console.error('No subscription found for subscriptionId');
        return;
      }

      await this.dbService.subscription.delete({
        where: { id: subscriptionRecord.id },
      });
    } catch (error) {
      console.error('Error handling subscription deleted', error);
    }
  }

  async handleSubscriptionPaused(subscription: Stripe.Subscription) {
    try {
      const subscriptionId = subscription.id;

      const subscriptionRecord = await this.dbService.subscription.findUnique({
        where: { subscriptionId },
      });

      if (!subscriptionRecord) {
        console.error('No subscription found for subscriptionId');
        return;
      }

      await this.dbService.subscription.update({
        where: { id: subscriptionRecord.id },
        data: {
          status: SubscriptionStatus.PAUSED,
        },
      });
    } catch (error) {
      console.error('Error handling subscription paused', error);
    }
  }

  async handleSubscriptionResumed(subscription: Stripe.Subscription) {
    try {
      const subscriptionId = subscription.id;

      const subscriptionRecord = await this.dbService.subscription.findUnique({
        where: { subscriptionId },
      });

      if (!subscriptionRecord) {
        console.error('No subscription found for subscriptionId');
        return;
      }

      await this.dbService.subscription.update({
        where: { id: subscriptionRecord.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
        },
      });
    } catch (error) {
      console.error('Error handling subscription resumed', error);
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const subscriptionId = subscription.id;

      console.log(
        'Subscription updated',
        JSON.stringify(subscription, null, 2),
      );

      const subscriptionRecord = await this.dbService.subscription.findUnique({
        where: { subscriptionId },
      });

      if (!subscriptionRecord) {
        console.error('No subscription found for subscriptionId');
        return;
      }

      const product = await this.stripe.products.retrieve(
        subscription.items.data[0].plan.product as string,
      );

      const subscriptionPlan = product.metadata['plan'] as SubscriptionPlan;

      await this.dbService.subscription.update({
        where: { id: subscriptionRecord.id },
        data: {
          periodEndsAt: dayjs
            .unix(subscription.cancel_at ?? subscription.current_period_end)
            .toDate(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: subscriptionPlan,
        },
      });
    } catch (error) {
      console.error('Error handling subscription updated', error);
    }
  }
}
