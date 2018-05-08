import http from "http";
import httpProxy from "http-proxy";
import { Client } from "node-rest-client";
import express from "express";
import cors from "cors";
import qs from "qs";
import request from "request";
import bodyParser from "body-parser";
import accepts from "accepts";
import { URL } from "url";
import cache from "./cache";

const IS_DEVELOPMENT = process.env.IS_DEVELOPMENT === "TRUE";

const API_USER = IS_DEVELOPMENT
  ? "snEO0U7aSy5GYYxHY7a8HHJ56sAgt4xS"
  : "rYBqQ95wyal3Iid2ZHhkeb7OzUNlqNjG";
const API_PASS = IS_DEVELOPMENT ? "DwMUvWuM03nc3N1w" : "ispjajjXUIwAOX1i";

const MIN_BALANCE = parseInt(process.env.MIN_BALANCE || "250");
const SESSION_DURATION_MINUTES = parseInt(
  process.env.SESSION_DURATION_MINUTES || "240"
);

const SERVER_ENDPOINT =
  process.env.SERVER_ENDPOINT ||
  (IS_DEVELOPMENT ? "https://test.api.tigo.com" : "https://prod.api.tigo.com");
const MSISDN_SERVER_ENDPOINT =
  process.env.MSISDN_SERVER_ENDPOINT ||
  (IS_DEVELOPMENT ? "https://test.api.tigo.com" : "https://prod.api.tigo.com");
const NET_CODE_SERVER_ENDPOINT = IS_DEVELOPMENT
  ? "http://millicom-nonprod-prod.apigee.net"
  : "https://prod.api.tigo.com";

const PORT = process.env.PORT || 5050;

console.log(
  SERVER_ENDPOINT,
  MSISDN_SERVER_ENDPOINT,
  NET_CODE_SERVER_ENDPOINT,
  PORT,
  API_USER,
  API_PASS
);

const client = new Client({
  user: API_USER,
  password: API_PASS
});

const clientArgs = {
  headers: { "x-edge": true }
};

const reqBodyParser = bodyParser.urlencoded({ extended: true });
const jsonBodyParser = bodyParser.json();

const parseRedirectQueryParam = redirect => {
  let params = {};
  const parsed = qs.parse(redirect);
  for (let k in parsed) {
    if (parsed.hasOwnProperty(k)) {
      let cleanK = k.split("?").pop();
      params[cleanK] = parsed[k];
    }
  }
  return params;
};

client.post(
  SERVER_ENDPOINT +
    "/oauth/client_credential/accesstoken?grant_type=client_credentials",
  clientArgs,
  (data, response) => {
    const accessToken = data.access_token;
    const proxy = httpProxy.createProxyServer({});
    const app = express();

    app.use(cors());

    app.post("/logout/:msisdn", (req, res) => {
      req.params.msisdn && cache.remove(req.params.msisdn);
      res.send("");
    });

    app.get("/redirect", reqBodyParser, (req, res) => {
      const redirect = !req.query.redirect;
      const accept = accepts(req);

      console.log("REDIRECT HEADERS", req.headers, "ACCEPTS");

      switch (accept.type(["json", "html"])) {
        case "html":
          res.redirect(
            302,
            process.env.FRONTEND_URL +
              "#!?" +
              qs.stringify({ netCode: req.query })
          );
          break;
        default:
          return res.json({
            method: req.method,
            headers: req.headers,
            queryParamters: req.query,
            body: req.body
          });
      }
    });

    app.options("/v1/tigo/mobile/msisdnAuth/sms_otp", (req, res) => {
      return res.send("");
    });

    app.get("/validate_sms_code", (req, res) => {
      console.log("TEST ENDPOINT", req.method, req.url);
      const URL =
        MSISDN_SERVER_ENDPOINT +
        "/v1/tigo/mobile/msisdnAuth/sms_code?" +
        qs.stringify({
          client_id: API_USER,
          response_type: "code",
          scope: "test",
          state: "appSpecificState",
          msisdn: req.query.msisdn,
          sms_password: req.query.sms_password,
          redirect_uri: process.env.BACKEND_URL + "redirect"
        });

      request.get(URL).pipe(res);
    });

    app.get("/v1/tigo/mobile/msisdnAuth/net_code", (req, res) => {
      console.log("TEST ENDPOINT (net_code)", req.method, req.url, req.headers);
      const URL =
        NET_CODE_SERVER_ENDPOINT +
        "/v1/tigo/mobile/msisdnAuth/net_code?" +
        unescape(
          qs.stringify({
            client_id: API_USER,
            response_type: "code",
            scope: "msisdn_auth",
            state: "appSpecificState",
            redirect_uri: process.env.BACKEND_URL + "redirect"
          })
        );

      request.get(
        {
          url: URL,
          headers: req.headers
        },
        (error, response, body) => {
          if (error) {
            res.status(response.statusCode).send(error);
          } else {
            res.status(response.statusCode).send(body);
          }
        }
      );
    });

    app.post("/v1/tigo/mobile/msisdnAuth/sms_otp", (req, res) => {
      console.log("TEST ENDPOINT", req.method, req.url);

      let target = MSISDN_SERVER_ENDPOINT;

      proxy.web(req, res, {
        target: target,
        changeOrigin: true,
        autoRewrite: true,
        followRedirects: true
      });
    });

    app.post("/v1/tigo/mobile/msisdnAuth/token", reqBodyParser, (req, res) => {
      console.log("TEST ENDPOINT", req.method, req.url);

      console.log("TOKEN INFO", {
        code: req.body.code,
        grant_type: "authorization_code",
        redirect_uri: process.env.BACKEND_URL + "redirect"
      });

      request.post(
        MSISDN_SERVER_ENDPOINT + "/v1/tigo/mobile/msisdnAuth/token",
        {
          form: {
            code: req.body.code,
            grant_type: "authorization_code",
            redirect_uri: process.env.BACKEND_URL + "redirect"
          },
          auth: {
            user: API_USER,
            pass: API_PASS
          }
        },
        (error, response, body) => {
          if (error) {
            res.status(response.statusCode).send(error);
          } else {
            try {
              const parsedBody = JSON.parse(body);
              const msisdn = parsedBody.msisdn;
              const cached = cache.get(msisdn);

              if (cached) {
                parsedBody.__cached = cached;
              }

              res.status(response.statusCode).json(parsedBody);
            } catch (e) {
              console.log(e);
              res.status(500);
            }
          }
        }
      );
    });

    app.post(
      "/v1/tigo/sales/gt/pos/retailers/:msisdn/balances",
      jsonBodyParser,
      (req, res) => {
        const msisdn = req.params.msisdn;
        const reqBody = req.body;
        const headers = req.headers;

        headers.host = new URL(SERVER_ENDPOINT).host;

        request(
          {
            method: "POST",
            url:
              SERVER_ENDPOINT +
              "/v1/tigo/sales/gt/pos/retailers/" +
              req.params.msisdn +
              "/balances",
            headers: headers,
            body: JSON.stringify(reqBody)
          },
          (error, response, body) => {
            if (error) {
              res.status(response.statusCode).send(error);
            } else {
              try {
                console.log("BALANCE RESPONSE", body);
                const parsedBody = JSON.parse(body);
                const balance = parsedBody.balances.balance;
                const isLow = MIN_BALANCE > balance;

                parsedBody.balances.isLow = isLow;

                cache.merge(msisdn, { req: { pin: reqBody.pin } });

                res.status(response.statusCode).json(parsedBody);
              } catch (e) {
                console.log(e);
                res.status(500);
              }
            }
          }
        );
      }
    );

    app.post("/v1/tigo/sales/gt/pos/login", jsonBodyParser, (req, res) => {
      const reqBody = req.body;
      const headers = req.headers;
      headers.host = new URL(SERVER_ENDPOINT).host;

      request(
        {
          method: "POST",
          url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/login",
          headers,
          body: JSON.stringify(req.body)
        },
        (error, response, body) => {
          if (error) {
            res.status(response.statusCode).send(error);
          } else {
            try {
              const parsedBody = JSON.parse(body);
              const sessionDurationSeconds = SESSION_DURATION_MINUTES * 60;
              const expiresAt = Date.now() + sessionDurationSeconds * 1000;

              parsedBody.expiresAt = expiresAt;

              const cacheKey = cache.set(
                reqBody.msisdn,
                {
                  req: reqBody,
                  res: parsedBody
                },
                sessionDurationSeconds
              );

              res.status(response.statusCode).json({ ...parsedBody });
            } catch (e) {
              console.log(e);
              res.status(500);
            }
          }
        }
      );
    });

    app.post(
      "/v1/tigo/sales/gt/pos/retailers/:msisdn/subscribers/:clientMsisdn/topups",
      jsonBodyParser,
      (req, res) => {
        const reqBody = req.body;
        const headers = req.headers;
        const msisdn = req.params.msisdn;
        const clientMsisdn = req.params.clientMsisdn;
        const pin = reqBody.retailerPin;
        headers.host = new URL(SERVER_ENDPOINT).host;

        request(
          {
            method: "POST",
            url:
              SERVER_ENDPOINT +
              "/v1/tigo/sales/gt/pos/retailers/" +
              msisdn +
              "/subscribers/" +
              clientMsisdn +
              "/topups",
            headers,
            body: JSON.stringify(req.body)
          },
          (error, response, body) => {
            if (error) {
              res.status(response.statusCode).send(error);
            } else {
              try {
                const parsedBody = JSON.parse(body);
                cache.merge(msisdn, {
                  req: { pin }
                });

                res.status(response.statusCode).json({ ...parsedBody });
              } catch (e) {
                console.log(e);
                res.status(500);
              }
            }
          }
        );
      }
    );

    app.post(
      "/v1/tigo/sales/gt/pos/retailers/:msisdn/subscribers/:clientMsisdn/products/:packageId",
      jsonBodyParser,
      (req, res) => {
        const reqBody = req.body;
        const headers = req.headers;
        const msisdn = req.params.msisdn;
        const clientMsisdn = req.params.clientMsisdn;
        const packageId = req.params.packageId;
        const pin = reqBody.retailerPin;

        headers.host = new URL(SERVER_ENDPOINT).host;

        console.log(
          "PACKAGE SELL ---------------------------------------------------------------"
        );
        console.log(
          SERVER_ENDPOINT +
            "/v1/tigo/sales/gt/pos/retailers/" +
            msisdn +
            "/subscribers/" +
            clientMsisdn +
            "/products/" +
            packageId
        );

        console.log(headers);

        console.log(reqBody);

        request(
          {
            method: "POST",
            url:
              SERVER_ENDPOINT +
              "/v1/tigo/sales/gt/pos/retailers/" +
              msisdn +
              "/subscribers/" +
              clientMsisdn +
              "/products/" +
              packageId,
            headers,
            body: JSON.stringify(reqBody)
          },
          (error, response, body) => {
            if (error) {
              res.status(response.statusCode).send(error);
            } else {
              try {
                const parsedBody = JSON.parse(body);
                cache.merge(msisdn, {
                  req: { pin }
                });

                res.status(response.statusCode).json({ ...parsedBody });
              } catch (e) {
                console.log(e);
                res.status(500);
              }
            }
          }
        );
      }
    );

    app.put("/v1/tigo/sales/gt/pos/credentials", jsonBodyParser, (req, res) => {
      const reqBody = req.body;
      const headers = req.headers;

      const msisdn = reqBody.msisdn;
      const pin = reqBody.newPin;

      headers.host = new URL(SERVER_ENDPOINT).host;

      request(
        {
          method: "PUT",
          url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/credentials",
          headers,
          body: JSON.stringify(req.body)
        },
        (error, response, body) => {
          console.log("CREDENTIALS UPDATE", error, response, body);
          if (error) {
            res.status(response.statusCode).send(error);
          } else {
            try {
              const parsedBody = JSON.parse(body);
              if (!parsedBody.error) {
                cache.merge(msisdn, {
                  req: { pin }
                });
              }

              res.status(response.statusCode).json({ ...parsedBody });
            } catch (e) {
              console.log(e);
              res.status(500);
            }
          }
        }
      );
    });

    app.all("/*", (req, res) => {
      console.log("QA ENDPOINT:", req.method, req.url);

      let target = SERVER_ENDPOINT;

      console.log(req.headers);

      proxy.web(req, res, {
        target: target,
        changeOrigin: true,
        autoRewrite: true,
        followRedirects: true
        //headers: req.headers
      });
    });

    console.log("listening on port " + PORT);
    app.listen(PORT);
  }
);
