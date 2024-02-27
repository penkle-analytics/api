import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { AuthEntity } from './entity/auth.entity';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto): Promise<AuthEntity> {
    const user = await this.usersService.findUnique(email);

    if (!user) {
      return null;
    }

    if (argon2.verify(user.password, password)) {
      const payload = { sub: user.id, email: user.email };

      return {
        accessToken: this.jwtService.sign(payload),
      };
    }

    return null;
  }

  async signup({ password, ...rest }: SignupDto): Promise<AuthEntity> {
    const user = await this.usersService.create({
      ...rest,
      password: await argon2.hash(password),
    });

    if (user) {
      const payload = { sub: user.id, email: user.email };

      return {
        accessToken: this.jwtService.sign(payload),
      };
    }

    return null;
  }
}
