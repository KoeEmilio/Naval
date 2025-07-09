import type { HttpContext } from '@adonisjs/core/http'
import Game from '#models/game'
import Board from '#models/board'
import User from '#models/user'

export default class GamesController {
  /**
   * Mostrar juegos en espera
   */
  async index({ auth }: HttpContext) {
    const games = await Game.query()
      .where('status', 'waiting')
      .preload('player1')

    return {
      games,
      auth: { user: auth.user },
    }
  }

  /**
   * Crear un nuevo juego
   */
  async create({ auth, response }: HttpContext) {
    const game = await Game.create({
      player_1: auth.user!.id,
      status: 'waiting',
    })

    await this.generateBoard(game, auth.user!)

    return response.redirect(`/games/${game.id}/play`)
  }

  /**
   * Unirse a un juego existente
   */
  async join({ params, auth, response }: HttpContext) {
    const game = await Game.findOrFail(params.id)

    if (game.status !== 'waiting') {
      return response.badRequest({
        error: 'El juego ya ha comenzado o ha finalizado.'
      })
    }

    await game.merge({
      player_2: auth.user!.id,
      status: 'active',
    }).save()

    await this.generateBoard(game, auth.user!)

    return response.redirect(`/games/${game.id}/play`)
  }

  /**
   * Generar tablero para un jugador
   */
  private async generateBoard(game: Game, user: User) {
    // Crear grilla 8x8 llena de ceros
    const grid = Array(8).fill(null).map(() => Array(8).fill(0))
    const positions = new Set<string>()

    // Colocar 15 barcos aleatoriamente
    while (positions.size < 15) {
      const x = Math.floor(Math.random() * 8)
      const y = Math.floor(Math.random() * 8)
      const key = `${x}-${y}`

      if (!positions.has(key)) {
        positions.add(key)
        grid[x][y] = 1
      }
    }

    await Board.create({
      gameId: game.id,
      playerId: user.id,
      grid,
    })
  }

  /**
   * Mostrar el juego
   */
  async show({ params, auth }: HttpContext) {
    const game = await Game.query()
      .where('id', params.id)
      .preload('boards')
      .preload('moves')
      .preload('player1')
      .preload('player2')
      .firstOrFail()

    return {
      game,
      auth: { user: auth.user },
    }
  }

  /**
   * Mostrar estadísticas del jugador
   */
  async stats({ auth }: HttpContext) {
    const games = await Game.query()
      .where('status', 'finished')
      .where((query) => {
        query.where('player_1', auth.user!.id)
          .orWhere('player_2', auth.user!.id)
      })
      .preload('moves', (movesQuery) => {
        movesQuery.preload('player')
      })
      .preload('player1')
      .preload('player2')
      .preload('boards')

    return {
      games,
      auth: { user: auth.user },
    }
  }
}