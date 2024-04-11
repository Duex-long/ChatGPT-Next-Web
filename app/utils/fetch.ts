const BASE_URL = "/gateway";
import CryptoJS from "crypto-js";
import { getToken, getUserId } from "./token";
const SECRET_ID = "AKIDz8krbsJ5yKBZQpn74WFkmLPx3*******";
const SECRET_KEY = "Gu5t9xGARNpq86cd98joQYCN3*******";

export const hash = (message: string) => {
  const hash = CryptoJS.SHA256(message);
  return hash.toString(CryptoJS.enc["Hex"]);
};

export const sha1 = (message: string) => {
  const hash = CryptoJS.SHA1(message);
  return hash.toString(CryptoJS.enc["Hex"]);
};

const sha256 = (
  message: string,
  secret = "",
  encoding?: keyof typeof CryptoJS.enc,
) => {
  const hash = CryptoJS.HmacSHA256(message, secret);
  return encoding ? hash.toString(CryptoJS.enc[encoding]) : hash;
};

const getSecretId = () => {
  return getUserId();
};

const getSecretKey = () => {
  return getToken();
};

const service = "cvm";
const endString = "base_request";
const action = "DescribeInstances";

/** 生成规范请求 */
const getHashedCanonicalRequest = (options: { [x: string]: string }) => {
  const {
    method,
    canonicalUri = "/",
    canonicalQueryString = "",
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload = "",
  } = options;
  const result =
    method +
    "\n" +
    canonicalUri +
    "\n" +
    canonicalQueryString +
    "\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    hashedRequestPayload;
  return hash(result);
};
const getAuthorizationHeader = (
  method: string,
  options: { [x: string]: string },
) => {
  const secretId = getSecretId() || SECRET_ID;
  const secretKey = getSecretKey() || SECRET_KEY;
  const { canonicalQueryString, hashedRequestPayload, timestamp } = options;
  const host = process.env.SERVER_HOST;
  const canonicalHeaders =
    "content-type:application/json; charset=utf-8\n" +
    "host:" +
    host +
    "\n" +
    "action:" +
    action.toLowerCase() +
    "\n";
  const signedHeaders = "content-type;host;action";
  const algorithm = "HMAC-SHA256";
  const [date] = getDate();

  const hashedCanonicalRequest = getHashedCanonicalRequest({
    method,
    canonicalHeaders,
    signedHeaders,
    canonicalQueryString,
    hashedRequestPayload,
  });

  const credentialScope = date + "/" + service + "/" + endString;

  const stringToSign =
    algorithm +
    "\n" +
    timestamp +
    "\n" +
    credentialScope +
    "\n" +
    hashedCanonicalRequest;

  const kDate = sha256(date as string, "BASE" + secretKey);
  const kService = sha256(service, kDate as string);
  const kSigning = sha256(endString, kService as string);
  const signature = sha256(stringToSign, kSigning as string, "Hex");
  const authorization =
    algorithm +
    " " +
    "Credential=" +
    secretId +
    "/" +
    credentialScope +
    ", " +
    "SignedHeaders=" +
    signedHeaders +
    ", " +
    "Signature=" +
    signature;

  return authorization;
};

function getDate(timestamp?: number) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return [`${year}-${month}-${day}`, date.getTime()];
}

export const fetchGet = (url: string, params?: { [x: string]: unknown }) => {
  const timeheaders = {
    Timestamp: `${new Date().getTime()}`,
  };
  const method: string = "GET";

  const path = `${BASE_URL}/${url}`;
  let query = "";
  let canonicalQueryString = "";
  const hashedRequestPayload = "";
  if (params) {
    Object.keys(params).forEach((item) => {
      query
        ? (query += `&${item}=${params[item]}`)
        : (query = `?${item}=${params[item]}`);
    });
    canonicalQueryString = query ? query.replace("?", "") : "";
  }
  return fetch(`${path}` + query, {
    method: "GET",
    headers: {
      Authorization: getAuthorizationHeader(method, {
        canonicalQueryString,
        hashedRequestPayload,
        timestamp: timeheaders.Timestamp,
      }),
      "Content-Type": "application/json; charset=utf-8",
      Action: "DescribeInstances",
      Version: "2017-03-12",
      Region: "ap-guangzhou",
      ...timeheaders,
    },
  });
};

export const fetchPostJson = (url: string, body: unknown = null) => {
  const timeheaders = {
    Timestamp: `${new Date().getTime()}`,
  };
  const method: string = "POST";

  const path = `${BASE_URL}/${url}`;
  const canonicalQueryString = "";
  let hashedRequestPayload = "";
  if (body) {
    hashedRequestPayload = hash(JSON.stringify(body));
  }

  return fetch(`${path}`, {
    method,
    headers: {
      Authorization: getAuthorizationHeader(method, {
        canonicalQueryString,
        hashedRequestPayload,
        timestamp: timeheaders.Timestamp,
      }),
      "Content-Type": "application/json; charset=utf-8",
      Action: "DescribeInstances",
      Version: "2017-03-12",
      Region: "ap-guangzhou",
      ...timeheaders,
    },
    body: JSON.stringify(body),
  });
};

type RequestOptions = {
  BASE_URL?: string;
};

class Request {
  static getTimeStamp() {
    return new Date().getTime();
  }

  BASE_URL = "/";
  requestIntercept = [];
  responseIntercept = [];

  constructor(options: RequestOptions) {
    const { BASE_URL = "" } = options;
    this.BASE_URL = BASE_URL;
  }

  methodGetHeaders(params?: { [x: string]: unknown }) {
    const timeSpamp = new Date().getTime();
    let query = "";
    let canonicalQueryString = "";
    const hashedRequestPayload = "";
    if (params) {
      Object.keys(params).forEach((item) => {
        query
          ? (query += `&${item}=${params[item]}`)
          : (query = `?${item}=${params[item]}`);
      });
      canonicalQueryString = query ? query.replace("?", "") : "";
    }
    return {
      Authorization: getAuthorizationHeader("GET", {
        canonicalQueryString,
        hashedRequestPayload,
        timestamp: `${timeSpamp}`,
        Action: "BASE_GET_REQUEST",
        Version: "2017-03-12",
        Region: "ap-guangzhou",
      }),
    };
  }

  methodPostHeaders(body = null) {
    const timeSpamp = new Date().getTime();
    const canonicalQueryString = "";
    let hashedRequestPayload = "";
    if (body) {
      hashedRequestPayload = hash(JSON.stringify(body));
    }
    return {
      Authorization: getAuthorizationHeader("POST", {
        canonicalQueryString,
        hashedRequestPayload,
        timestamp: `${timeSpamp}`,
        Action: "BASE_POST_REQUEST",
        Version: "2017-03-12",
        Region: "ap-guangzhou",
      }),
    };
  }

  generateAssignHeaders(method: string, data: any) {
    method = method.toLocaleUpperCase();
    if (method == "GET") return this.methodGetHeaders;
    else if (method == "POST") return this.methodPostHeaders;
  }

  fetchGet(
    url: string,
    params?: { [x: string]: unknown },
    options?: RequestInit,
  ) {
    url = this.BASE_URL + url;
    const assignHeaders = this.methodGetHeaders(params);

    const _options = {
      method: "GET",
      headers: {
        ...assignHeaders,
      },
    };
    this._fetchRequest(url, _options);
  }

  fetchPost(url: string, body = null, options?: RequestInit) {
    url = this.BASE_URL + url;
    const assignHeaders = this.methodPostHeaders(body);

    const _options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",

        ...assignHeaders,
      },
    };
    this._fetchRequest(url, _options);
  }

  _fetchRequest(url: string, options: RequestInit) {
    return fetch(url, options);
  }
}
