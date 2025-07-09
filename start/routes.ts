/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const GamesController = () => import('#controllers/games_controller')
const MovesController = () => import('#controllers/moves_controller')
const AuthController = () => import('#controllers/auth_controller')



router.group(() => {
  router.post('/register', [AuthController, 'register']).as('auth.register')
  router.post('/login', [AuthController, 'login']).as('auth.login')
}).prefix('/auth')

router.group(() => {
  
  router.get('/me', [AuthController, 'me']).as('auth.me')
  router.post('/logout', [AuthController, 'logout']).as('auth.logout')
  
  router.get('/games', [GamesController, 'index']).as('games.index')
  router.post('/games', [GamesController, 'create']).as('games.create')
  router.get('/games/:id', [GamesController, 'show']).as('games.show')
  router.post('/games/:id/join', [GamesController, 'join']).as('games.join')
  router.get('/games/:id/play', [GamesController, 'show']).as('games.play')
  router.get('/games/stats', [GamesController, 'stats']).as('games.stats')

  router.post('/games/:gameId/moves', [MovesController, 'store']).as('moves.store')
  router.get('/games/:gameId/poll', [MovesController, 'poll']).as('moves.poll')

}).use(middleware.auth())

router.group(() => {
}).prefix('/api')
