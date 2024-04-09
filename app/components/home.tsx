"use client";

require("../polyfill");

import { useState, useEffect, Dispatch, SetStateAction } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { ModelProvider, Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import { getISOLang, getLang } from "../locales";

import { md5 } from "js-md5";
import uuidv4 from "uuid-random";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { getClientConfig } from "../config/client";
import { ClientApi } from "../client/api";
import { useAccessStore } from "../store";
import { IconButton } from "./button";
import { Input, PasswordInput, Toast, showToast } from "./ui-lib";
import { fetchGet, fetchPostJson } from "../utils/fetch";
import { clearCache, getToken, setToken, setUserId } from "../utils/token";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
};

const checkLogin = () => {
  const token = getToken();
  if (token) return true;
  return false;
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isMobileScreen = useMobileScreen();
  const [loginState, setLoginState] = useState(checkLogin());
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);

  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);

  return (
    <>
      <div
        className={
          styles.container +
          ` ${
            shouldTightBorder ? styles["tight-container"] : styles.container
          } ${getLang() === "ar" ? styles["rtl-screen"] : ""}`
        }
      >
        {isAuth ? (
          <>{/* <AuthPage /> */}</>
        ) : (
          <>
            <SideBar className={isHome ? styles["sidebar-show"] : ""} />

            <div className={styles["window-content"]} id={SlotID.AppBody}>
              <Routes>
                <Route path={Path.Home} element={<Chat />} />
                <Route path={Path.NewChat} element={<NewChat />} />
                <Route path={Path.Masks} element={<MaskPage />} />
                <Route path={Path.Chat} element={<Chat />} />
                <Route path={Path.Settings} element={<Settings />} />
              </Routes>
            </div>

            {loginState ? undefined : (
              <LoginContainer changeStateFunc={setLoginState} />
            )}
          </>
        )}
      </div>
    </>
  );
}

const getCacheKey = () => uuidv4();

const getPublicKey = async (cacheKey: string): Promise<string> => {
  const res = await fetchGet("admin/user/getPublicKey", { cacheKey });
  const { data } = await res.json();
  return data;
};
const rsaEncrypt = (publicKey: string, target: string) => {
  // import JsEncrypt from "jsencrypt";

  const JsEncrypt = require("jsencrypt");
  console.log(JsEncrypt, "JsEncrypt");
  const myEncrypt = new JsEncrypt.default();
  const md5Target = md5(target);
  myEncrypt.setPublicKey(publicKey);
  const result = myEncrypt.encrypt(md5Target);
  return result || "";
};

const userLogin = async (username: string, password: string) => {
  clearCache();
  const cacheKey = getCacheKey();
  const publicKey = await getPublicKey(cacheKey);
  if (publicKey) {
    const encryptPassword = rsaEncrypt(publicKey, password);
    if (!encryptPassword) {
      throw Error("加密错误");
    }
    const userInfo = {
      username,
      password: encryptPassword,
      cacheKey,
    };
    const loginResponse = await fetchPostJson("admin/user/login", userInfo);
    const data = await loginResponse.json();
    if (data.message) {
      throw Error(data.message);
    }
    return data.data;
  }
};

function LoginContainer({
  changeStateFunc,
}: {
  changeStateFunc: Dispatch<SetStateAction<boolean>>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loadingState, setLoadingState] = useState(false);

  const checkFormIsEmpty = () => {
    let check = false;
    !username
      ? showToast("请输入用户名")
      : !password
      ? showToast("请输入密码")
      : (check = true);
    return check;
  };
  const loginClick = async () => {
    const allowNext = checkFormIsEmpty();
    if (!allowNext) return;
    setLoadingState(true);
    try {
      const data = await userLogin(username, password);
      setToken(data.token);
      setUserId(username);
      changeStateFunc(true);
      // navigate('/', {
      //   replace: true,
      // })
    } catch (e) {
      showToast("登陆失败");
    } finally {
      setPassword("");
      setLoadingState(false);
    }
  };
  return (
    <>
      <div className={styles["login-container"]}>
        <h3 className={styles["login-title"]}>需要验证</h3>
        <p> 使用功能需要有账户验证许可</p>
        <div className={styles["insert-container"]}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            placeholder="Insert username"
          />
        </div>
        <div className={styles["insert-container"]}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Insert password"
          />
        </div>
        <IconButton onClick={loginClick} key="confirm" text="Submit" />
      </div>
      {loadingState ? (
        <div className={styles["login-container"]}>
          <Loading noLogo />
        </div>
      ) : undefined}
    </>
  );
}

export function useLoadData() {
  const config = useAppConfig();

  var api: ClientApi;
  if (config.modelConfig.model.startsWith("gemini")) {
    api = new ClientApi(ModelProvider.GeminiPro);
  } else {
    api = new ClientApi(ModelProvider.GPT);
  }
  useEffect(() => {
    (async () => {
      const models = await api.llm.models();
      config.mergeModels(models);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Home() {
  useSwitchTheme();
  useLoadData();
  useHtmlLang();

  useEffect(() => {
    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();
  }, []);

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
