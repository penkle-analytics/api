import { Injectable } from '@nestjs/common';
import { User, WaitlistUser } from '@prisma/client';
import * as argon2 from 'argon2';
import { DbService } from 'src/db/db.service';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  async findUnique(email: string): Promise<User | undefined> {
    return this.dbService.user.findUnique({ where: { email } });
  }

  async create(email: string, password: string): Promise<User> {
    const user = {
      email,
      password: await argon2.hash(password),
    };

    return this.dbService.user.create({ data: user });
  }

  async createWaitlist(email: string): Promise<WaitlistUser> {
    return this.dbService.waitlistUser.create({ data: { email } });
  }
}
