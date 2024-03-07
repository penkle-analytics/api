import { IsOptional, IsUrl } from 'class-validator';

export class CreateBillingPortalSessionDto {
  @IsUrl()
  @IsOptional()
  redirectUrl?: string;
}
