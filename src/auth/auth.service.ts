import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validate(email: string, password: string): Promise<any> {
    const user = await this.usersService.findUnique(email);

    if (!user) {
      return null;
    }

    if (argon2.verify(user.password, password)) {
      const { password, ...result } = user;

      return result;
    }

    return null;
  }
}
