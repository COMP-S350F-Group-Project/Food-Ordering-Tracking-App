import { EventEmitter } from "node:events";
import { TrackingUpdate } from "../../libs/common/types";

class TrackingGateway extends EventEmitter {
  emitUpdate(update: TrackingUpdate) {
    this.emit("update", update);
  }

  onUpdate(listener: (update: TrackingUpdate) => void) {
    this.on("update", listener);
  }
}

export const trackingGateway = new TrackingGateway();
