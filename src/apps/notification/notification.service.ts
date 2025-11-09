import { logger } from "../../libs/common/logger";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  channel: "push" | "sms" | "email";
}

export class NotificationService {
  send(payload: NotificationPayload) {
    logger.info("Dispatching notification", { payload });
  }
}
