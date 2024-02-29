import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DomainsService {
  constructor(private readonly dbService: DbService) {}

  create(data: Prisma.DomainCreateArgs) {
    return this.dbService.domain.create(data);
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
