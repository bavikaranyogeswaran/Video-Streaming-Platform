import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [VideosModule],
  providers: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
