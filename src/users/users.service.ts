import { Injectable } from '@nestjs/common';
import { Prisma, User, WaitlistUser } from '@prisma/client';
import { DbService } from 'src/db/db.service';

@Injectable()
export class UsersService {
  constructor(private readonly dbService: DbService) {}

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.dbService.user.create({ data });
  }

  createWaitlistUser(
    data: Prisma.WaitlistUserCreateInput,
  ): Promise<WaitlistUser> {
    return this.dbService.waitlistUser.create({ data });
  }

  findUnique(args: Prisma.UserFindUniqueArgs): Promise<User | undefined> {
    return this.dbService.user.findUnique(args);
  }

  findFirst(args: Prisma.UserFindFirstArgs) {
    return this.dbService.user.findFirst(args);
  }

  findMany(args: Prisma.UserFindManyArgs) {
    return this.dbService.user.findMany(args);
  }

  update(args: Prisma.UserUpdateArgs): Promise<User> {
    return this.dbService.user.update(args);
  }
}
