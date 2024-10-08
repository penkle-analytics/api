import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { AuthEntity } from './entities/auth.entity';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import { ResetDto } from './dto/reset.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.usersService.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    if (await argon2.verify(user.password, password)) {
      const payload = { sub: user.id, email: user.email };

      return {
        accessToken: this.jwtService.sign(payload),
      };
    }

    return null;
  }

  async signup({ password, confirmPassword, ...rest }: SignupDto) {
    if (password !== confirmPassword) {
      return null;
    }

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

  async forgot(email: string) {
    const user = await this.usersService.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const payload = { sub: user.id, email: user.email };

    console.log(
      `Send an email to ${
        user.email
      } with the following token: ${this.jwtService.sign(payload)}`,
    );

    return null;
  }

  async reset(
    userId: string,
    { password, confirmPassword }: ResetDto,
  ): Promise<AuthEntity> {
    if (password !== confirmPassword) {
      return null;
    }

    const user = await this.usersService.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    await this.usersService.update({
      where: { id: userId },
      data: { password: await argon2.hash(password) },
    });

    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
