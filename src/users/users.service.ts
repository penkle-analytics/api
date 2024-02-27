import { Injectable } from '@nestjs/common';
import { Prisma, User, WaitlistUser } from '@prisma/client';
import { DbService } from 'src/db/db.service';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  async findUnique(args: Prisma.UserFindUniqueArgs): Promise<User | undefined> {
    return this.dbService.user.findUnique(args);
  }

  async create(user: Prisma.UserCreateInput): Promise<User> {
    return this.dbService.user.create({ data: user });
  }

  async createWaitlist(
    user: Prisma.WaitlistUserCreateInput,
  ): Promise<WaitlistUser> {
    return this.dbService.waitlistUser.create({ data: user });
  }
}
