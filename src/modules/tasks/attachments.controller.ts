import {
  Controller,
  Get,
  HttpError,
  Post,
  UseGuards,
  reply,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { multipart } from '@avijs/multipart';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import * as v from 'valibot';
import { Config } from '../../config.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ProjectMemberGuard } from './project.guard.js';
import { TaskParams } from './tasks.dto.js';

const Attachment = v.object({
  id: v.number(),
  filename: v.string(),
  mimeType: v.string(),
  size: v.number(),
  createdAt: v.date(),
});
const DownloadParams = v.object({
  ...TaskParams.entries,
  attachmentId: v.pipe(v.string(), v.regex(/^\d+$/), v.transform(Number)),
});

const list = {
  params: TaskParams,
  response: v.array(Attachment),
} satisfies RouteSchema;
const upload = {
  params: TaskParams,
  response: v.array(Attachment),
} satisfies RouteSchema;
const download = { params: DownloadParams } satisfies RouteSchema;

@Controller('/tasks/:taskId/attachments')
@UseGuards(AuthGuard, ProjectMemberGuard)
export class AttachmentsController {
  constructor(
    private readonly db: PrismaClient,
    private readonly config: Config,
  ) {}

  @Get('', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.db.attachment.findMany({
      where: { taskId: ctx.input.params.taskId },
    });
  }

  /** multipart/form-data with one or more files: images, PDFs or text, up to 5 MB each. */
  @Post('', { schema: upload })
  async upload(ctx: RouteContext<typeof upload>) {
    const dir = path.resolve(this.config.UPLOAD_DIR);
    await mkdir(dir, { recursive: true });
    const saved = [];
    for await (const part of multipart(ctx, {
      fileSize: 5_000_000,
      files: 5,
      accept: ['image/*', 'application/pdf', 'text/plain'],
    })) {
      if (part.kind === 'field') continue;
      // Stored under a name we choose; the client's name is only shown back.
      const storedAs = randomUUID();
      const file = path.join(dir, storedAs);
      let size = 0;
      part.stream.on('data', (chunk: Buffer) => (size += chunk.length));
      try {
        await pipeline(part.stream, createWriteStream(file));
      } catch (error) {
        await rm(file, { force: true });
        throw error;
      }
      saved.push(
        await this.db.attachment.create({
          data: {
            taskId: ctx.input.params.taskId,
            filename: part.filename,
            mimeType: part.mimeType,
            size,
            storedAs,
          },
        }),
      );
    }
    if (saved.length === 0) throw new HttpError(400, 'Send at least one file');
    return reply(saved, { status: 201 });
  }

  @Get('/:attachmentId', { schema: download })
  async download(ctx: RouteContext<typeof download>) {
    const { taskId, attachmentId } = ctx.input.params;
    const attachment = await this.db.attachment.findFirst({
      where: { id: attachmentId, taskId },
    });
    if (!attachment) throw new HttpError(404, 'Attachment not found');
    const file = path.join(path.resolve(this.config.UPLOAD_DIR), attachment.storedAs);
    return reply(createReadStream(file), {
      headers: {
        'content-type': attachment.mimeType,
        // The name came from a client: encoded, so it cannot break the header.
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      },
    });
  }
}
