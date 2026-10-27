import './inject.gen.js'; // dependency lists avi dev infers from constructors
import { Module } from '@avijs/core';
import { OpenApiModule } from '@avijs/openapi';
import { toJsonSchema } from '@valibot/to-json-schema';
import { HealthController } from './common/health.controller.js';
import { Config } from './config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { TeamsModule } from './modules/teams/teams.module.js';

const docs = OpenApiModule.forRoot({
  info: { title: 'Tasks API', version: '0.1.0' },
  toJsonSchema: (schema) => toJsonSchema(schema as never, { errorMode: 'ignore' }),
});

@Module({
  imports: [Config.module, docs, AuthModule, TeamsModule, TasksModule],
  controllers: [HealthController],
})
export class AppModule {}
