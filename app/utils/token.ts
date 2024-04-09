import { sha1 } from "./fetch";

export function estimateTokenLength(input: string): number {
  let tokenLength = 0;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);

    if (charCode < 128) {
      // ASCII character
      if (charCode <= 122 && charCode >= 65) {
        // a-Z
        tokenLength += 0.25;
      } else {
        tokenLength += 0.5;
      }
    } else {
      // Unicode character
      tokenLength += 1.5;
    }
  }

  return tokenLength;
}

const USER_KEY = "fd7d08f5-9aea-4e07-bd6a-9b6f4a92e7c3";

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const setUserId = (username: string) => {
  localStorage.setItem(USER_KEY, sha1(username));
};
export const getToken = () => {
  return localStorage.getItem("token");
  // return true
};

export const getUserId = () => {
  return localStorage.getItem(USER_KEY);
};
export const removeToken = () => {
  localStorage.removeItem("token");
};
export const removeUserId = () => {
  localStorage.removeItem(USER_KEY);
};

export const setRoleInfo = (info: string) => {
  localStorage.setItem("info", info);
};

export const getRoleInfo = () => {
  return localStorage.getItem("info");
};

export const removeInfo = () => {
  return localStorage.removeItem("info");
};

export const clearCache = () => {
  removeToken();
  removeUserId();
  removeInfo();
};
