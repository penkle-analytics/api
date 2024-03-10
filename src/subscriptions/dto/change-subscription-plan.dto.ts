import { SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class ChangeSubscriptionPlanDto {
  @IsEnum([
    SubscriptionPlan.DEVELOPER,
    SubscriptionPlan.HOBBYIST,
    SubscriptionPlan.INDIE,
    SubscriptionPlan.STARTUP,
  ])
  @IsNotEmpty()
  plan!: SubscriptionPlan;

  @IsUrl()
  @IsOptional()
  redirectUrl?: string;
}
