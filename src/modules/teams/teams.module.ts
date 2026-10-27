import { Module } from '@avijs/core';
import { DatabaseModule } from '../../common/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
