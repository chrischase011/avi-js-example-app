import { Module } from '@avijs/core';
import { DatabaseModule } from '../../common/database.module.js';
import { Config } from '../../config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './tokens.service.js';

// Exports TokenService, so modules that import this one can use AuthGuard.
@Module({
  imports: [Config.module, DatabaseModule],
  controllers: [AuthController],
  providers: [TokenService, AuthService],
  exports: [TokenService],
})
export class AuthModule {}
