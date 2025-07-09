import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Game from '#models/game'
import Board from '#models/board'
import Move from '#models/move'
import logger from '@adonisjs/core/services/logger'

export default class MovesController {

  async store({ request, params, auth, response }: HttpContext) {
    const game = await Game.findOrFail(params.gameId)

    logger.info('Intento de movimiento', {
      user_id: auth.user!.id,
      game_id: game.id,
      game_status: game.status,
      is_player_turn: await this.isPlayerTurn(game, auth.user!.id),
      request_data: request.all(),
    })

    const moveValidator = vine.compile(
      vine.object({
        x: vine.number().min(0).max(7),
        y: vine.number().min(0).max(7),
      })
    )

    const { x, y } = await request.validateUsing(moveValidator)

    const existingMove = await Move.query()
      .where('gameId', game.id)
      .where('playerId', auth.user!.id)
      .where('x', x)
      .where('y', y)
      .first()

    if (existingMove) {
      logger.warn('Movimiento duplicado', { x, y })
      return response.badRequest({
        error: 'Ya has realizado un movimiento en esa posición.',
        game: await this.getGameWithRelations(game)
      })
    }

    if (game.status !== 'active' || !(await this.isPlayerTurn(game, auth.user!.id))) {
      logger.error('Movimiento inválido', {
        game_status: game.status,
        is_player_turn: await this.isPlayerTurn(game, auth.user!.id),
      })
      return response.badRequest({
        error: 'Estado del juego inválido o no es tu turno.',
        game: await this.getGameWithRelations(game)
      })
    }

    const opponentId = game.player_1 === auth.user!.id ? game.player_2 : game.player_1

    const opponentBoard = await Board.query()
      .where('gameId', game.id)
      .where('playerId', opponentId)
      .first()

    if (!opponentBoard) {
      logger.error('Tablero del oponente no encontrado', { 
        game_id: game.id, 
        opponent_id: opponentId 
      })
      return response.badRequest({
        error: 'Tablero del oponente no encontrado.',
        game: await this.getGameWithRelations(game)
      })
    }

    const grid = opponentBoard.grid
    logger.debug('Grid del oponente', { grid })

    if (!grid[y] || grid[y][x] === undefined) {
      logger.error('Índice de grid inválido', { y, x })
      return response.badRequest({
        error: 'Posición inválida en el tablero.',
        game: await this.getGameWithRelations(game)
      })
    }

    const result = grid[y][x] ? 'hit' : 'miss'

    const move = await Move.create({
      gameId: game.id,
      playerId: auth.user!.id,
      x,
      y,
      result,
    })

    logger.info('Movimiento registrado', {
      move_id: move.id,
      result,
      x,
      y,
    })

    const hitsCount = await Move.query()
      .where('gameId', game.id)
      .where('playerId', auth.user!.id)
      .where('result', 'hit')
      .count('* as total')

    const totalHits = hitsCount[0].$extras.total

    if (totalHits >= 15) {
      await game.merge({
        status: 'finished',
        winner: auth.user!.id,
      }).save()
      
      logger.info('Juego finalizado', { winner: auth.user!.id })
    }

    return {
      message: 'Movimiento registrado correctamente.',
      result,
      game: await this.getGameWithRelations(await game.refresh())
    }
  }

  /**
   * Polling para obtener actualizaciones del juego
   */
  async poll({ request, params, auth }: HttpContext) {
    const game = await Game.findOrFail(params.gameId)
    const lastMoveId = parseInt(request.qs().last_move_id || '0')

    const latestMove = await Move.query()
      .where('gameId', game.id)
      .where('id', '>', lastMoveId)
      .orderBy('id', 'desc')
      .first()

    if (latestMove) {
      logger.info('Nuevo movimiento detectado en polling', { move_id: latestMove.id })
      return {
        game: await this.getGameWithRelations(await game.refresh()),
        last_move_id: latestMove.id,
        auth: { user: auth.user },
      }
    }

    return {
      game: await this.getGameWithRelations(game),
      last_move_id: lastMoveId,
      auth: { user: auth.user },
      status: 'no_changes'
    }
  }

  /**
   * Verificar si es el turno del jugador
   */
  private async isPlayerTurn(game: Game, userId: number): Promise<boolean> {
    const lastMove = await Move.query()
      .where('gameId', game.id)
      .orderBy('id', 'desc')
      .first()

    logger.info('Verificando turno', {
      game_id: game.id,
      user_id: userId,
      last_move_player_id: lastMove ? lastMove.playerId : null,
      player_1: game.player_1,
      player_2: game.player_2,
      is_first_move: !lastMove,
      is_player_turn: !lastMove ? game.player_1 === userId : lastMove.playerId !== userId,
    })

    return !lastMove
      ? game.player_1 === userId
      : lastMove.playerId !== userId
  }

  /**
   * Obtener juego con todas las relaciones cargadas
   */
  private async getGameWithRelations(game: Game) {
    return await Game.query()
      .where('id', game.id)
      .preload('boards')
      .preload('moves')
      .preload('player1')
      .preload('player2')
      .firstOrFail()
  }
}