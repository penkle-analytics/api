import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Prisma } from '@prisma/client';
import { CreateDomainDto } from './dto/create-domain.dto';

@Injectable()
export class DomainsService {
  constructor(private readonly dbService: DbService) {}

  create(userId: string, createDomainDto: CreateDomainDto) {
    return this.dbService.domain.create({
      data: {
        ...createDomainDto,
        users: {
          create: {
            userId,
          },
        },
      },
    });
  }

  getUserDomainsByUserId(userId: string) {
    return this.dbService.userDomain.findMany({
      where: {
        userId,
      },
      include: {
        domain: true,
      },
    });
  }

  findAll(data: Prisma.DomainFindManyArgs) {
    return this.dbService.domain.findMany(data);
  }

  findUnique(data: Prisma.DomainFindUniqueArgs) {
    return this.dbService.domain.findUnique(data);
  }

  update(data: Prisma.DomainUpdateArgs) {
    return this.dbService.domain.update(data);
  }

  remove(data: Prisma.DomainDeleteArgs) {
    return this.dbService.domain.delete(data);
  }
}
