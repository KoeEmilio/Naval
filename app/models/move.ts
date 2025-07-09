import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Game from './game.js'
import User from './user.js'

export default class Move extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'gameId' })
  declare gameId: number

  @column({ columnName: 'playerId' })
  declare playerId: number

  @column()
  declare x: number

  @column()
  declare y: number

  @column()
  declare result: string

  @column.dateTime({ autoCreate: true, columnName: 'createdAt' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updatedAt' })
  declare updatedAt: DateTime

  // Relaciones
  @belongsTo(() => Game)
  declare game: BelongsTo<typeof Game>

  @belongsTo(() => User, {
    foreignKey: 'playerId'
  })
  declare player: BelongsTo<typeof User>
}