import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new video metadata entry' })
  @ApiResponse({ status: 201, type: VideoResponseDto })
  async create(
    @Body() createVideoDto: CreateVideoDto,
    @CurrentUser() user: any,
  ): Promise<VideoResponseDto> {
    return this.videosService.create(createVideoDto, user.username);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all videos' })
  @ApiResponse({ status: 200, type: [VideoResponseDto] })
  async findAll(): Promise<VideoResponseDto[]> {
    return this.videosService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get video details by ID' })
  @ApiResponse({ status: 200, type: VideoResponseDto })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(@Param('id') id: string): Promise<VideoResponseDto> {
    return this.videosService.findOne(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a video entry' })
  @ApiResponse({ status: 200, description: 'Video successfully deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.videosService.delete(id);
  }
}
