import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import { UsersService } from 'src/users/users.service';

@Controller('/')
export class GatewayController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(LocalAuthGuard)
  @Post('/auth/login')
  async login(@Req() req: Request) {
    // @ts-ignore
    return this.usersService.findUnique(req.user.email);
  }

  @Post('/auth/waitlist')
  async waitlist(@Req() req: Request) {
    return this.usersService.create(req.body['email'], req.body['password']);
  }
}
