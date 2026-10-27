import './inject.gen.js'; // dependency lists avi dev infers from constructors
import { Module } from '@avijs/core';
import { HealthController } from './common/health.controller.js';
import { Config } from './config.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({ imports: [Config.module, UsersModule], controllers: [HealthController] })
export class AppModule {}
