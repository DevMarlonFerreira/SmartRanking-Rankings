import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RankingsService } from './rankings/rankings.service';
import { RankingsModule } from './rankings/rankings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env' }),
    MongooseModule.forRoot(`${process.env.MONGODB_URL}`),
    RankingsModule,
  ],
  controllers: [],
  providers: [RankingsService],
})
export class AppModule {}
