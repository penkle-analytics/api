import { SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsEnum([
    SubscriptionPlan.DEVELOPER,
    SubscriptionPlan.HOBBYIST,
    SubscriptionPlan.INDIE,
    SubscriptionPlan.STARTUP,
  ])
  @IsNotEmpty()
  plan!: SubscriptionPlan;

  @IsString()
  @IsOptional()
  redirectUrl?: string;
}
