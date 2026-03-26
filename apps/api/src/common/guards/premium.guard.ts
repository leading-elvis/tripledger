import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 進階版功能 Guard
 *
 * 檢查旅程是否為進階版，用於保護需要付費的 API 端點。
 * 需要在 request 中有 tripId（可來自 params、body 或 query）。
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 確保使用者已認證（應由 JwtAuthGuard 設置）
    if (!user?.id) {
      throw new ForbiddenException('需要先登入');
    }

    // 從多個來源取得 tripId
    const tripId =
      request.params?.tripId ||
      request.body?.tripId ||
      request.query?.tripId;

    if (!tripId) {
      throw new BadRequestException('需要提供 tripId');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        premiumExpiresAt: true,
        members: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('旅程不存在');
    }

    // 檢查使用者是否為旅程成員
    if (trip.members.length === 0) {
      throw new ForbiddenException('您不是此旅程的成員');
    }

    // 檢查進階狀態
    const isPremium =
      trip.premiumExpiresAt && trip.premiumExpiresAt > new Date();

    if (!isPremium) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'PREMIUM_REQUIRED',
        message: '此功能需要升級進階版',
      });
    }

    return true;
  }
}
