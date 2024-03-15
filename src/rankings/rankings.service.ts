import { Injectable, Logger } from '@nestjs/common';
import { Partida } from './interfaces/partida.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ranking } from './interfaces/ranking.schema';
import { RpcException } from '@nestjs/microservices';
import { ClientProxySmartRanking } from 'src/proxyrmq/client-proxy';
import { Categoria } from './interfaces/categoria.interface';
import { lastValueFrom } from 'rxjs';
import { EventoNome } from './evento-nome.enum';
import {
  Historico,
  RankingResponse,
} from './interfaces/ranking-response.interface';
import * as momentTimezone from 'moment-timezone';
import { Desafio } from './interfaces/desafio.interface';
import * as _ from 'lodash';

@Injectable()
export class RankingsService {
  constructor(
    @InjectModel('Ranking') private readonly desafioModel: Model<Ranking>,
    private clientProxySmartRanking: ClientProxySmartRanking,
  ) {}
  private readonly logger = new Logger(RankingsService.name);
  private clientAdminBackend =
    this.clientProxySmartRanking.getClientProxyAdminBackendInstance();

  async processarPartida(idPartida: string, partida: Partida): Promise<void> {
    try {
      const categoria$ = this.clientAdminBackend.send(
        'consultar-categorias',
        partida.categoria,
      );
      const categoria: Categoria = await lastValueFrom(categoria$);

      await Promise.all(
        partida.jogadores.map(async (jogador) => {
          const ranking = new this.desafioModel();

          ranking.categoria = partida.categoria;
          ranking.desafio = partida.desafio;
          ranking.partida = idPartida;
          ranking.jogador = jogador;

          if (jogador === partida.def) {
            const eventoFilter = categoria.eventos.filter(
              (evento) => evento.nome === EventoNome.VITORIA,
            );
            ranking.evento = EventoNome.VITORIA;
            ranking.operacao = eventoFilter[0].operacao;
            ranking.pontos = eventoFilter[0].valor;
          } else {
            const eventoFilter = categoria.eventos.filter(
              (evento) => evento.nome === EventoNome.DERROTA,
            );
            ranking.evento = EventoNome.DERROTA;
            ranking.operacao = eventoFilter[0].operacao;
            ranking.pontos = eventoFilter[0].valor;
          }

          this.logger.log(`RANKING: ${JSON.stringify(ranking)}`);
          ranking.save();
        }),
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`error: ${JSON.stringify(error)}`);
        throw new RpcException(error.message);
      } else {
        this.logger.error(`unknown error: ${JSON.stringify(error)}`);
        throw new RpcException('unknown error');
      }
    }
  }

  async consultarRankings(
    idCategoria: string,
    dataRef: string,
  ): Promise<RankingResponse[] | RankingResponse> {
    try {
      this.logger.log(`idCategoiria: ${idCategoria} - dataRef: ${dataRef}`);

      if (!dataRef) {
        momentTimezone().tz('America/Sao_Paulo').format('YYYY-MM-DD');
        this.logger.log(`dataRef: ${dataRef}`);
      }

      const registrosRanking = await this.desafioModel
        .find()
        .where('categoria')
        .equals(idCategoria)
        .lean()
        .exec();

      const desafios$ = this.clientDesafios.send(
        'consultar-desafios-realizados',
        { idCategoria, dataRef },
      );

      const desafios: Desafio[] = await lastValueFrom(desafios$);

      _.remove(registrosRanking, function (item) {
        return (
          desafios.filter((desafio) => desafio._id === item.desafio).length ===
          0
        );
      });

      const resultado = _(registrosRanking)
        .groupBy('jogador')
        .map((itens, key) => ({
          jogador: key,
          historico: _.countBy(itens, 'evento'),
          pontos: _.sumBy(itens, 'pontos'),
        }))
        .value();

      const resultadoOrdenado = _.orderBy(resultado, 'pontos', 'desc');

      const rankingResponseList: RankingResponse[] = [];

      resultadoOrdenado.map(function (item, index) {
        const rankingResponse: RankingResponse = {};

        rankingResponse.jogador = item.jogador;
        rankingResponse.posicao = index + 1;
        rankingResponse.pontuacao = item.pontos;

        const historico: Historico = {};

        historico.vitorias = item.historico.VITORIA
          ? item.historico.VITORIA
          : 0;
        historico.derrotas = item.historico.DERROTA
          ? item.historico.DERROTA
          : 0;
        rankingResponse.historicoPartidas = historico;

        rankingResponseList.push(rankingResponse);
      });

      return rankingResponseList;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`error: ${JSON.stringify(error.message)}`);
        throw new RpcException(error.message);
      } else {
        this.logger.error(`unknown error: ${JSON.stringify(error)}`);
        throw new RpcException(`unknown error`);
      }
    }
  }
}
