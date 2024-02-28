import { Injectable } from '@nestjs/common';
import { UpdateDomainDto } from './dto/update-domain.dto';
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

  update(id: number, updateDomainDto: UpdateDomainDto) {
    throw new Error('Method not implemented.');
  }

  remove(id: number) {
    throw new Error('Method not implemented.');
  }
}
