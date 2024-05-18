import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateCheckoutSessionDto } from 'src/subscriptions/dto/create-checkout-session';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { CreateBillingPortalSessionDto } from 'src/subscriptions/dto/create-billing-portal-session.dto';
import { ChangeSubscriptionPlanDto } from 'src/subscriptions/dto/change-subscription-plan.dto';

declare global {
  namespace Express {
    interface User {
      sub: string;
    }
  }
}

@Controller('/')
export class GatewaySubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('/subscriptions/plans')
  async getSubscriptions() {
    try {
      return this.subscriptionsService.getSubscriptions({
        includeFree: true,
      });
    } catch (error) {
      console.error('Error getting subscriptions', error);

      return [];
    }
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/checkout-session')
  async createCheckoutSession(
    @Req() req: Request,
    @Body() createCheckoutSession: CreateCheckoutSessionDto,
  ) {
    console.log('POST /subscriptions/checkout-session', {
      createCheckoutSession,
    });

    return this.subscriptionsService.createCheckoutSession(
      req['user'].sub,
      createCheckoutSession,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/billing-portal-session')
  async createBillingPortalSession(
    @Req() req: Request,
    @Body() createBillingPortalSessionDto: CreateBillingPortalSessionDto,
  ) {
    console.log('POST /subscriptions/billing-portal-session');

    return this.subscriptionsService.createBillingPortalSession(
      req['user'].sub,
      createBillingPortalSessionDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('/subscription')
  async getSubscription(@Req() req: Request) {
    const subscription =
      await this.subscriptionsService.findSubscriptionByUserId(req['user'].sub);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/change-plan')
  async changeSubscriptionPlan(
    @Req() req: Request,
    @Body() changeSubscriptionPlanDto: ChangeSubscriptionPlanDto,
  ) {
    console.log('POST /subscriptions/change-plan', {
      changeSubscriptionPlanDto,
    });

    return this.subscriptionsService.changeSubscriptionPlan(
      req['user'].sub,
      changeSubscriptionPlanDto,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/unsubscribe')
  async unsubscribe(@Req() req: Request) {
    console.log('POST /subscriptions/unsubscribe');

    return this.subscriptionsService.unsubscribe(req['user'].sub);
  }

  @UseGuards(AuthGuard)
  @Post('/subscriptions/resubscribe')
  async resubscribe(@Req() req: Request) {
    console.log('POST /subscriptions/resubscribe');

    return this.subscriptionsService.resubscribe(req['user'].sub);
  }
}
