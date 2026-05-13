// =================================================================================
// VIDEOS CONTROLLER (The Discovery API)
// =================================================================================
// This controller exposes the video catalog to the public.
// It provides endpoints for listing the video feed, retrieving
// asset details, and administrative record management.
// =================================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  // [NESTJS] Dependency Injection for video business logic
  constructor(private readonly videosService: VideosService) {}

  // CREATE: Registers a new video metadata record
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new video metadata entry' })
  @ApiResponse({ status: 201, type: VideoResponseDto })
  async create(
    @Body() createVideoDto: CreateVideoDto,
    @CurrentUser() user: any,
  ): Promise<VideoResponseDto> {
    // 1. [SECURITY] Validate JWT via global guard (implicit)
    // 2. [SIDE EFFECT] Delegate record creation to VideosService
    return this.videosService.create(createVideoDto, user.username);
  }

  // FIND ALL: Publicly accessible video feed
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all videos' })
  @ApiResponse({ status: 200, type: [VideoResponseDto] })
  async findAll(): Promise<VideoResponseDto[]> {
    // 1. [SIDE EFFECT] Fetch indexed video catalog from Redis
    return this.videosService.findAll();
  }

  // FIND ONE: Retrieves detailed metadata for a specific asset
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get video details by ID' })
  @ApiResponse({ status: 200, type: VideoResponseDto })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(@Param('id') id: string): Promise<VideoResponseDto> {
    // 1. [VALIDATION] Verify video exists in the metadata store
    return this.videosService.findOne(id);
  }

  // DELETE: Administrative route to remove video metadata
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a video entry' })
  @ApiResponse({ status: 200, description: 'Video successfully deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    // 1. [SECURITY] Verify session identity (JWT)
    // 2. [SIDE EFFECT] Trigger metadata and index cleanup in Redis
    return this.videosService.delete(id);
  }

  // REPAIR: Manual consistency restoration for a specific node
  @Post(':id/repair/:node')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger manual replication repair for a node' })
  @ApiResponse({ status: 200, description: 'Repair triggered successfully' })
  async repair(
    @Param('id') id: string,
    @Param('node') node: string,
  ): Promise<{ success: boolean }> {
    const success = await this.videosService.repair(id, node);
    return { success };
  }
}
