import { Browser } from "@capacitor/browser";
import {
  OAuth2Client,
  OAuth2AuthenticateOptions,
} from "@byteowls/capacitor-oauth2";

export class Capacitor {
  public static async openBrowser(
    url: string,
    callback: (url: string) => Promise<void>
  ) {
    await Browser.open({ url: url, presentationStyle: "popover" });
    let listener = await Browser.addListener("browserFinished", () => {
      listener.remove();
    });
  }
  public static async triggerOAuthMobile(
    options: OAuth2AuthenticateOptions
  ): Promise<any> {
    return await OAuth2Client.authenticate(options);
  }
}
