"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _httpProxy = require("http-proxy");

var _httpProxy2 = _interopRequireDefault(_httpProxy);

var _nodeRestClient = require("node-rest-client");

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _cors = require("cors");

var _cors2 = _interopRequireDefault(_cors);

var _qs = require("qs");

var _qs2 = _interopRequireDefault(_qs);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _bodyParser = require("body-parser");

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _accepts = require("accepts");

var _accepts2 = _interopRequireDefault(_accepts);

var _url = require("url");

var _cache = require("./cache");

var _cache2 = _interopRequireDefault(_cache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var IS_DEVELOPMENT = process.env.IS_DEVELOPMENT === "TRUE";

var API_USER = IS_DEVELOPMENT ? "snEO0U7aSy5GYYxHY7a8HHJ56sAgt4xS" : "rYBqQ95wyal3Iid2ZHhkeb7OzUNlqNjG";
var API_PASS = IS_DEVELOPMENT ? "DwMUvWuM03nc3N1w" : "ispjajjXUIwAOX1i";

var MIN_BALANCE = parseInt(process.env.MIN_BALANCE || "250");
var SESSION_DURATION_MINUTES = parseInt(process.env.SESSION_DURATION_MINUTES || "240");

var SERVER_ENDPOINT = process.env.SERVER_ENDPOINT || (IS_DEVELOPMENT ? "https://test.api.tigo.com" : "https://prod.api.tigo.com");
var MSISDN_SERVER_ENDPOINT = process.env.MSISDN_SERVER_ENDPOINT || (IS_DEVELOPMENT ? "https://test.api.tigo.com" : "https://prod.api.tigo.com");
var NET_CODE_SERVER_ENDPOINT = IS_DEVELOPMENT ? "http://millicom-nonprod-prod.apigee.net" : "https://prod.api.tigo.com";

var PORT = process.env.PORT || 5050;

console.log(SERVER_ENDPOINT, MSISDN_SERVER_ENDPOINT, NET_CODE_SERVER_ENDPOINT, PORT, API_USER, API_PASS);

var client = new _nodeRestClient.Client({
  user: API_USER,
  password: API_PASS
});

var clientArgs = {
  headers: { "x-edge": true }
};

var reqBodyParser = _bodyParser2.default.urlencoded({ extended: true });
var jsonBodyParser = _bodyParser2.default.json();

var parseRedirectQueryParam = function parseRedirectQueryParam(redirect) {
  var params = {};
  var parsed = _qs2.default.parse(redirect);
  for (var k in parsed) {
    if (parsed.hasOwnProperty(k)) {
      var cleanK = k.split("?").pop();
      params[cleanK] = parsed[k];
    }
  }
  return params;
};

client.post(SERVER_ENDPOINT + "/oauth/client_credential/accesstoken?grant_type=client_credentials", clientArgs, function (data, response) {
  var accessToken = data.access_token;
  var proxy = _httpProxy2.default.createProxyServer({});
  var app = (0, _express2.default)();

  app.use((0, _cors2.default)());

  app.post("/logout/:msisdn", function (req, res) {
    req.params.msisdn && _cache2.default.remove(req.params.msisdn);
    res.send("");
  });

  app.get("/redirect", reqBodyParser, function (req, res) {
    var redirect = !req.query.redirect;
    var accept = (0, _accepts2.default)(req);

    console.log("REDIRECT HEADERS", req.headers, "ACCEPTS");

    switch (accept.type(["json", "html"])) {
      case "html":
        res.redirect(302, process.env.FRONTEND_URL + "#!?" + _qs2.default.stringify({ netCode: req.query }));
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

  app.options("/v1/tigo/mobile/msisdnAuth/sms_otp", function (req, res) {
    return res.send("");
  });

  app.get("/validate_sms_code", function (req, res) {
    console.log("TEST ENDPOINT", req.method, req.url);
    var URL = MSISDN_SERVER_ENDPOINT + "/v1/tigo/mobile/msisdnAuth/sms_code?" + _qs2.default.stringify({
      client_id: API_USER,
      response_type: "code",
      scope: "test",
      state: "appSpecificState",
      msisdn: req.query.msisdn,
      sms_password: req.query.sms_password,
      redirect_uri: process.env.BACKEND_URL + "redirect"
    });

    _request2.default.get(URL).pipe(res);
  });

  app.get("/v1/tigo/mobile/msisdnAuth/net_code", function (req, res) {
    console.log("TEST ENDPOINT (net_code)", req.method, req.url, req.headers);
    var URL = NET_CODE_SERVER_ENDPOINT + "/v1/tigo/mobile/msisdnAuth/net_code?" + unescape(_qs2.default.stringify({
      client_id: API_USER,
      response_type: "code",
      scope: "msisdn_auth",
      state: "appSpecificState",
      redirect_uri: process.env.BACKEND_URL + "redirect"
    }));

    _request2.default.get({
      url: URL,
      headers: req.headers
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        res.status(response.statusCode).send(body);
      }
    });
  });

  app.post("/v1/tigo/mobile/msisdnAuth/sms_otp", function (req, res) {
    console.log("TEST ENDPOINT", req.method, req.url);

    var target = MSISDN_SERVER_ENDPOINT;

    proxy.web(req, res, {
      target: target,
      changeOrigin: true,
      autoRewrite: true,
      followRedirects: true
    });
  });

  app.post("/v1/tigo/mobile/msisdnAuth/token", reqBodyParser, function (req, res) {
    console.log("TEST ENDPOINT", req.method, req.url);

    console.log("TOKEN INFO", {
      code: req.body.code,
      grant_type: "authorization_code",
      redirect_uri: process.env.BACKEND_URL + "redirect"
    });

    _request2.default.post(MSISDN_SERVER_ENDPOINT + "/v1/tigo/mobile/msisdnAuth/token", {
      form: {
        code: req.body.code,
        grant_type: "authorization_code",
        redirect_uri: process.env.BACKEND_URL + "redirect"
      },
      auth: {
        user: API_USER,
        pass: API_PASS
      }
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          var parsedBody = JSON.parse(body);
          var msisdn = parsedBody.msisdn;
          var cached = _cache2.default.get(msisdn);

          if (cached) {
            parsedBody.__cached = cached;
          }

          res.status(response.statusCode).json(parsedBody);
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.post("/v1/tigo/sales/gt/pos/retailers/:msisdn/balances", jsonBodyParser, function (req, res) {
    var msisdn = req.params.msisdn;
    var reqBody = req.body;
    var headers = req.headers;

    headers.host = new _url.URL(SERVER_ENDPOINT).host;

    (0, _request2.default)({
      method: "POST",
      url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/retailers/" + req.params.msisdn + "/balances",
      headers: headers,
      body: JSON.stringify(reqBody)
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          console.log("BALANCE RESPONSE", body);
          var parsedBody = JSON.parse(body);
          var balance = parsedBody.balances.balance;
          var isLow = MIN_BALANCE > balance;

          parsedBody.balances.isLow = isLow;

          _cache2.default.merge(msisdn, { req: { pin: reqBody.pin } });

          res.status(response.statusCode).json(parsedBody);
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.post("/v1/tigo/sales/gt/pos/login", jsonBodyParser, function (req, res) {
    var reqBody = req.body;
    var headers = req.headers;
    headers.host = new _url.URL(SERVER_ENDPOINT).host;

    (0, _request2.default)({
      method: "POST",
      url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/login",
      headers: headers,
      body: JSON.stringify(req.body)
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          var parsedBody = JSON.parse(body);
          var sessionDurationSeconds = SESSION_DURATION_MINUTES * 60;
          var expiresAt = Date.now() + sessionDurationSeconds * 1000;

          parsedBody.expiresAt = expiresAt;

          var cacheKey = _cache2.default.set(reqBody.msisdn, {
            req: reqBody,
            res: parsedBody
          }, sessionDurationSeconds);

          res.status(response.statusCode).json(_extends({}, parsedBody));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.post("/v1/tigo/sales/gt/pos/retailers/:msisdn/subscribers/:clientMsisdn/topups", jsonBodyParser, function (req, res) {
    var reqBody = req.body;
    var headers = req.headers;
    var msisdn = req.params.msisdn;
    var clientMsisdn = req.params.clientMsisdn;
    var pin = reqBody.retailerPin;
    headers.host = new _url.URL(SERVER_ENDPOINT).host;

    (0, _request2.default)({
      method: "POST",
      url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/retailers/" + msisdn + "/subscribers/" + clientMsisdn + "/topups",
      headers: headers,
      body: JSON.stringify(req.body)
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          var parsedBody = JSON.parse(body);
          _cache2.default.merge(msisdn, {
            req: { pin: pin }
          });

          res.status(response.statusCode).json(_extends({}, parsedBody));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.post("/v1/tigo/sales/gt/pos/retailers/:msisdn/subscribers/:clientMsisdn/products/:packageId", jsonBodyParser, function (req, res) {
    var reqBody = req.body;
    var headers = req.headers;
    var msisdn = req.params.msisdn;
    var clientMsisdn = req.params.clientMsisdn;
    var packageId = req.params.packageId;
    var pin = reqBody.retailerPin;

    headers.host = new _url.URL(SERVER_ENDPOINT).host;

    console.log("PACKAGE SELL ---------------------------------------------------------------");
    console.log(SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/retailers/" + msisdn + "/subscribers/" + clientMsisdn + "/products/" + packageId);

    console.log(headers);

    console.log(reqBody);

    (0, _request2.default)({
      method: "POST",
      url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/retailers/" + msisdn + "/subscribers/" + clientMsisdn + "/products/" + packageId,
      headers: headers,
      body: JSON.stringify(reqBody)
    }, function (error, response, body) {
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          var parsedBody = JSON.parse(body);
          _cache2.default.merge(msisdn, {
            req: { pin: pin }
          });

          res.status(response.statusCode).json(_extends({}, parsedBody));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.put("/v1/tigo/sales/gt/pos/credentials", jsonBodyParser, function (req, res) {
    var reqBody = req.body;
    var headers = req.headers;

    var msisdn = reqBody.msisdn;
    var pin = reqBody.newPin;

    headers.host = new _url.URL(SERVER_ENDPOINT).host;

    (0, _request2.default)({
      method: "PUT",
      url: SERVER_ENDPOINT + "/v1/tigo/sales/gt/pos/credentials",
      headers: headers,
      body: JSON.stringify(req.body)
    }, function (error, response, body) {
      console.log("CREDENTIALS UPDATE", error, response, body);
      if (error) {
        res.status(response.statusCode).send(error);
      } else {
        try {
          var parsedBody = JSON.parse(body);
          if (!parsedBody.error) {
            _cache2.default.merge(msisdn, {
              req: { pin: pin }
            });
          }

          res.status(response.statusCode).json(_extends({}, parsedBody));
        } catch (e) {
          console.log(e);
          res.status(500);
        }
      }
    });
  });

  app.all("/*", function (req, res) {
    console.log("QA ENDPOINT:", req.method, req.url);

    var target = SERVER_ENDPOINT;

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
});