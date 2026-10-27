import { Module } from '@avijs/core';
import { DatabaseModule } from '../../common/database.module.js';
import { Config } from '../../config.js';
import { AuthModule } from '../auth/auth.module.js';
import { AttachmentsController } from './attachments.controller.js';
import { TaskEvents } from './task-events.js';
import { ProjectTasksController, TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [Config.module, DatabaseModule, AuthModule],
  controllers: [ProjectTasksController, TasksController, AttachmentsController],
  providers: [TasksService, TaskEvents],
  exports: [TasksService],
})
export class TasksModule {}
