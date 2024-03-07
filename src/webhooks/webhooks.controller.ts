import { Controller, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config';

@Controller('webhooks')
export class WebhooksController {
  stripe: Stripe;

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      configService.get<Config['stripeSecretKey']>('stripeSecretKey'),
    );
  }

  @Post('/stripe')
  async handleStripeWebhook(
    // https://docs.nestjs.com/faq/raw-body
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const sig = req.headers['stripe-signature'];
    const signingSecret = this.configService.get<Config['stripeSigningSecret']>(
      'stripeSigningSecret',
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        signingSecret,
      );
    } catch (err) {
      console.error(err);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case 'customer.subscription.created':
        await this.webhooksService.handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.webhooksService.handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.webhooksService.handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send();
  }
}
