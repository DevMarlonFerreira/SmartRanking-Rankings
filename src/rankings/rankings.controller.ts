import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Partida } from './interfaces/partida.interface';
import { RankingsService } from './rankings.service';
import { RankingResponse } from './interfaces/ranking-response.interface';

const ackErrors: string[] = ['E11000'];
@Controller()
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  private readonly logger = new Logger(RankingsController.name);

  @EventPattern('procesar-partida')
  async processarPartida(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`data: ${JSON.stringify(data)}`);
      const idPartida: string = data.idPartida;
      const partida: Partida = data.partida;

      await this.rankingsService.processarPartida(idPartida, partida);
      await channel.ack(originalMsg);
    } catch (error) {
      if (error instanceof Error) {
        const filterAckError = ackErrors.filter((ackError) =>
          error.message.includes(ackError),
        );

        if (filterAckError.length > 0) {
          await channel.ack(originalMsg);
        }
      } else {
        this.logger.error(`unknown error: ${JSON.stringify(error)}`);
        // throw new RpcException(`unknown error`);
      }
    }
  }

  @MessagePattern('consultar-rankings')
  async consultarRankings(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<RankingResponse[] | RankingResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const { idCategoria, dataRef } = data;

      return await this.rankingsService.consultarRankings(idCategoria, dataRef);
    } finally {
      await channel.ack(originalMsg);
    }
  }
}
