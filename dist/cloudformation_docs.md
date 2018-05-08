# TiGo Deployment Script documentation

Here are the values that need to be provided to the deployment script config:

* _GitRemote_: git@github.com:maddevelopmentco/tigo-proxy.git
* _FrontendGitRemote_: git@github.com:maddevelopmentco/tigo.git
* _DeployPublicKey_: Will be provided on demand
* _DeployPrivateKey_: Will be provided on demand
* _FrontendDeployPublicKey_: Will be provided on demand
* _FrontendDeployPrivateKey_: Will be provided on demand
* _ProxyEnv_: Environent variables passed to the frontend app, full list below
* _FrontendEnv_: Environent variables passed to the frontend app, full list below

## ProxyEnv variables

* `MIN_BALANCE` - minumum balance value before the warning is shown to user. Default value: 250
* `SESSION_DURATION_MINUTES` - defines how long the session is valid. Default value: 240
* `SERVER_ENDPOINT` - server endpoint for Guatemala API calls. Default value: https://test.api.tigo.com
* `MSISDN_SERVER_ENDPOINT` - server endpoint for MSISDN identification. Default value: https://test.api.tigo.com
* `NET_CODE_SERVER_ENDPOINT` - server endpoint for automatic MSISDN identification. Default value: http://millicom-nonprod-prod.apigee.net
* `FRONTEND_URL` - URL where the frontend app is deployed (with trailing slash)
* `BACKEND_URL` - URL where the backend app is deployed (with trailing slash)

In production FRONTEND_URL and BACKEND_URL will probably have the same value - the domain where the app is deployed (e.g. `https://mitienda.com/`).

## FrontendEnv variables

* `REACT_APP_NETCODE_URL` - URL location of the endpoint that will be used for the automatic MSISDN detection. In the development we used: `http://millicom-nonprod-prod.apigee.net/v1/tigo/mobile/msisdnAuth/net_code\?client_id\=snEO0U7aSy5GYYxHY7a8HHJ56sAgt4xS\&response_type\=code\&scope\=msisdn_auth\&state\=appSpecificState\&redirect_uri\=https://tigo-proxy.herokuapp.com/redirect` . Redirect URI passed as the query param should be the ProxyEnv `BACKEND_URL` + "redirect" (this is the URL of the service that can handle OAuth redirects)
* `REACT_APP_API_HOST` - URL location of the API server (without trailing slash) - e.g. `https://mitienda.com`
* `REACT_APP_SEGMENT_TRACK` - this env variable MUST be set to `TRUE` for the Segment tracking to work
