import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '取得當前用戶資訊' })
  async getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: '更新當前用戶資訊' })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刪除當前用戶帳號（不可逆）' })
  async deleteMe(@CurrentUser() user: { id: string }) {
    await this.usersService.deleteAccount(user.id);
    return { success: true, message: '帳號已成功刪除' };
  }

  @Get(':id')
  @ApiOperation({ summary: '取得指定用戶資訊（僅限共享旅程的成員）' })
  async getUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    // 驗證當前用戶與目標用戶是否共享至少一個旅程
    const hasAccess = await this.usersService.hasSharedTrip(currentUser.id, id);
    if (!hasAccess) {
      throw new ForbiddenException('您無權查看此用戶資訊');
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('用戶不存在');
    }
    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
