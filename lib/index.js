import { fetch } from "node-fetch";
import { writeFile, readFile } from "fs/promises";

const cache = new Map();

class Yukk {
  constructor(...args) {
    let data;
    if (args.length > 1) [mode, clientId, clientSecret, customUrl] = args;
    else if (args.length == 1 && typeof args[0] == "object")
      ({ mode, clientId, clientSecret, callbackUrl, customUrl } = args[0]);

    if (!mode || !clientId || !clientSecret)
      throw new Error(`Required Argument "mode", "clientId", "clientSecret"`);
    if (!/(sandbox|live)/i.test(mode))
      throw new Error(`Mode Only sandbox or live`);
    this.url_sandbox = "https://api.yukk.me";
    this.url_live = "https://live.yukk.me";
    this._clientId = clientId;
    this.mode = mode;
    if (customUrl) this.url = customUrl;
    else if (/sandbox/i.test(mode)) this.url = this.url_sandbox;
    else if (/live/i.test(mode)) this.url = this.url_sandbox;
    this._clientSecret = clientSecret;
    this._headers = {
      accept: "application/json",
      "content-type": "application/json",
    };
  }
  __fetch(path, opts) {
    return new Promise((resolve, reject) => {
      if (opts.headers) {
        opts.headers = {
          ...this._headers,
          ...opts.headers,
        };
      } else {
        opts.headers = {
          ...this._headers,
        };
      }
      fetch(`${this.url}${path}`, opts)
        .then((data) => data.json())
        .then((json) => resolve(json))
        .catch((err) => reject({ error: err.toString() }));
    });
  }
  async getAuth() {
    let body = JSON.stringify({
      grant_type: "client_credentials",
      client_id: this._clientId,
      client_secret: this._clientSecret,
    });
    return this.__fetch("/v2/oauth/token", { body, method: "POST" })
      .then((data) => {
        cache.set("access_token", data);
        return data;
      })
      .catch((e) => {
        throw new Error(`Something went wrong!\n${e}`);
      });
  }

  async connect(callbackUrl) {
    if (!callbackUrl) throw new Error(`Required callbackUrl`);
    if (!cache.has("access_token"))
      throw new Error("Please run function getAuth() to get access_token");
    let body = JSON.stringify({ redirect: callbackUrl });
    let dataAuth = cache.get("access_token");
    return this.__fetch("/v2/partner/user/requests/connect", {
      body,
      method: "POST",
      headers: { authorization: `Bearer ` + dataAuth.access_token },
    }).catch((e) => {
      throw new Error(`Something went wrong!\n${e}`);
    });
  }
}
