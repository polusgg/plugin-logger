import { Collection } from "mongodb";
import { Event } from "./event";
import WebSocket from "ws";

export class Events {
  public static collection?: Collection;
  public static realtime?: WebSocket;
  public static lastPong: number = Date.now();

  static fire(event: Event): void {
    if (this.realtime) {
      this.realtime.send(JSON.stringify({
        type: "NODE_EVENT",
        event: event,
      }));
    }

    this.collection?.insertOne({
      ...event,
      time: Date.now(),
    });
  }

  static attemptRealtimeConnection(): void {
    if (this.realtime) {
      console.log("Already connected to realtime data stream!?!?");

      this.realtime.close();

      return;
    }

    const sock = new WebSocket("wss://events.pgg.hall.ly/evt");

    sock.on("pong", () => {
      this.lastPong = Date.now();
    });

    sock.on("open", () => {
      this.lastPong = Date.now();

      console.log({
        token: process.env.NP_AUTH_TOKEN?.trim(),
        name: process.env.NP_NODE_HOSTNAME?.trim(),
      });

      sock.send(JSON.stringify({
        type: "AUTHENTICATION_NODE_REQUEST",
        token: process.env.NP_AUTH_TOKEN?.trim(),
        name: process.env.NP_NODE_HOSTNAME?.trim(),
      }));

      sock.on("message", msg => {
        try {
          const d = JSON.parse(msg.toString());

          if (d.event === "AUTHENTICATION_SUCCESS") {
            this.realtime = sock;
          } else {
            console.log("UNEXPECTED MESSAGE", d);
            sock.close();
          }
        } catch {
          console.log("INVALID MESSAGE", msg, msg.toString());
          sock.close();
        }
      });
    });

    sock.on("error", err => {
      console.log("SOCKET ERROR", err);
    });

    sock.on("close", () => {
      console.log("SOCKET CLOSED");

      setTimeout(() => {
        this.attemptRealtimeConnection();
      }, 10000);
    });
  }
}

Events.attemptRealtimeConnection();

setInterval(() => {
  if (Events.realtime) {
    Events.realtime.ping();

    if (Date.now() - Events.lastPong > 10000) {
      delete Events.realtime;

      Events.realtime.close();
    }
  }
}, 5000);
