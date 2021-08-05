import { Collection } from "mongodb";
import { Event } from "./event";

export class Events {
  public static collection: Collection;

  static fire(event: Event): void {
    this.collection.insertOne({
      ...event,
      time: Date.now(),
    });
  }
}
