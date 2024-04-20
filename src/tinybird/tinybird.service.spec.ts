import { Test, TestingModule } from '@nestjs/testing';
import { TinybirdService } from './tinybird.service';

describe('TinybirdService', () => {
  let service: TinybirdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TinybirdService],
    }).compile();

    service = module.get<TinybirdService>(TinybirdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
