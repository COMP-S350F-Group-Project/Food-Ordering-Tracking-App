import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import {
  dataStore,
  updatePaymentStatus,
} from "../../infrastructure/data-store";
import { AppError, NotFoundError } from "../../libs/common/errors";
import { PayStatus, Payment } from "../../libs/common/types";

export interface InitializePaymentInput {
  orderId: string;
  channel: Payment["channel"];
  amount: number;
}

export class PaymentService {
  listPayments(): Payment[] {
    return Array.from(dataStore.payments.values());
  }

  findByOrder(orderId: string): Payment | undefined {
    return Array.from(dataStore.payments.values()).find((p) => p.orderId === orderId);
  }

  initializePayment(input: InitializePaymentInput): Payment {
    const existing = this.findByOrder(input.orderId);
    if (existing) {
      return existing;
    }
    const payment: Payment = {
      id: randomUUID(),
      orderId: input.orderId,
      channel: input.channel,
      amount: input.amount,
      status: "PENDING",
    };
    dataStore.payments.set(payment.id, payment);
    return payment;
  }

  updateStatus(orderId: string, nextStatus: PayStatus): Payment {
    const payment = this.findByOrder(orderId);
    if (!payment) {
      throw new NotFoundError("Payment", { orderId });
    }

    if (payment.status === nextStatus) {
      return payment;
    }

    if (payment.status === "FAILED" || payment.status === "REFUNDED") {
      throw new AppError("Cannot update finalised payment", 409);
    }

    payment.status = nextStatus;
    payment.processedAt = new Date();
    payment.txnId = payment.txnId ?? `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    dataStore.payments.set(payment.id, payment);
    updatePaymentStatus(orderId, nextStatus);
    return payment;
  }

  simulatePayment(orderId: string, success: boolean): Payment {
    const payment = this.findByOrder(orderId);
    if (!payment) {
      throw new NotFoundError("Payment", { orderId });
    }
    payment.processedAt = dayjs().toDate();
    payment.status = success ? "PAID" : "FAILED";
    payment.txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    dataStore.payments.set(payment.id, payment);
    updatePaymentStatus(orderId, payment.status);
    return payment;
  }

  refund(orderId: string): Payment {
    return this.updateStatus(orderId, "REFUNDED");
  }
}
