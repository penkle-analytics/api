import { IsEnum, IsNotEmpty } from 'class-validator';
import { CreateSessionDto } from './create-billing-portal-session.dto';

export enum SubscriptionPlan {
  DEVELOPER = 'DEVELOPER',
  HOBBYIST = 'HOBBYIST',
  INDIE = 'INDIE',
  STARTUP = 'STARTUP',
}

export class CreateCheckoutSession extends CreateSessionDto {
  @IsEnum([
    SubscriptionPlan.DEVELOPER,
    SubscriptionPlan.HOBBYIST,
    SubscriptionPlan.INDIE,
    SubscriptionPlan.STARTUP,
  ])
  @IsNotEmpty()
  plan!: SubscriptionPlan;
}
