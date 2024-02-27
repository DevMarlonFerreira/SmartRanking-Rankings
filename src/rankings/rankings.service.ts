import { Injectable, Logger } from '@nestjs/common';
import { Partida } from './interfaces/partida.interface';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  async processarPartida(idPartida: string, partida: Partida): Promise<void> {
    this.logger.log(
      `idPartida: ${JSON.stringify(idPartida)} - partida: ${JSON.stringify(partida)}`,
    );
  }
}
