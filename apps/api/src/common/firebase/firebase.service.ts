import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured. Push notifications will be disabled.',
      );
      return;
    }

    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        this.isInitialized = true;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * 發送推播通知到單一裝置
   */
  async sendToDevice(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized, skipping push notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'tripledger_notifications',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.debug(`Push notification sent to token: ${token.slice(0, 20)}...`);
      return true;
    } catch (error: any) {
      // Handle invalid token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(`Invalid FCM token: ${token.slice(0, 20)}...`);
        return false;
      }
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return false;
    }
  }

  /**
   * 發送推播通知到多個裝置
   */
  async sendToDevices(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized, skipping push notifications');
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'tripledger_notifications',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, index) => {
        if (!resp.success && resp.error) {
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      this.logger.debug(
        `Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send multicast push notification: ${error.message}`);
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  /**
   * 檢查 Firebase 是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
