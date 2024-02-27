import { Module } from '@nestjs/common';
import { RankingsController } from './rankings.controller';
import { RankingSchema } from './interfaces/ranking.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { RankingsService } from './rankings.service';
import { ProxyRMQModule } from 'src/proxyrmq/proxyrmq.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Ranking', schema: RankingSchema }]),
  ],
  providers: [RankingsService, ProxyRMQModule],
  controllers: [RankingsController],
})
export class RankingsModule {}
