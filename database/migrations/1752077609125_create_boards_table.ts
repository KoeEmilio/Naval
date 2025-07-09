import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boards'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Cambiar game_id a gameId y player_id a playerId para coincidir con el modelo
      table.integer('gameId').unsigned().notNullable()          
      table.foreign('gameId').references('id').inTable('game').onDelete('CASCADE') // ← tabla 'game', no 'games'
      
      table.integer('playerId').unsigned().notNullable()        
      table.foreign('playerId').references('id').inTable('users').onDelete('CASCADE')
      
      // Agregar la columna grid que faltaba
      table.text('grid').notNullable()                          // Para almacenar el JSON del tablero
      
      // El modelo Board tiene static timestamps = false, así que no agregar timestamps
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}