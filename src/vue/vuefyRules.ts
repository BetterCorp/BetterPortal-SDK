export class vuefyRules {
  public static readonly email: Array<any> = [
    (v?: string) => !!v || "E-mail is required",
    (v: string) =>
      /^([A-Za-z0-9\-_.]){1,}@([A-Za-z0-9\-_.]){1,}\.([a-z]){1,}$/.test(v) ||
      "E-mail must be valid",
  ];
  public static basicText(propName: string, minLength = 2, maxLength = 255) {
    return [
      (v?: string) => !!v || `${propName} is required`,
      (v: string) =>
        `${v}`.length >= minLength ||
        `${propName} must be a min of ${minLength} characters long`,
      (v: string) =>
        `${v}`.length <= maxLength ||
        `${propName} must be a max of ${maxLength} characters long`,
      (v: string) =>
        /^([A-Za-z0-9\-_.,&\w !|]){0,512}$/.test(v) ||
        `${propName} must not contain special characters`,
    ];
  }
  public static basicTextNotReq(
    propName: string,
    minLength = 2,
    maxLength = 255
  ) {
    return [
      (v?: string) => !!v || `${propName} is required`,
      (v: string) =>
        `${v}`.length >= minLength ||
        `${propName} must be a min of ${minLength} characters long`,
      (v: string) =>
        `${v}`.length <= maxLength ||
        `${propName} must be a max of ${maxLength} characters long`,
      (v: string) =>
        /^([A-Za-z0-9\-_.,&\w !|]){0,512}$/.test(v) ||
        `${propName} must not contain special characters`,
    ];
  }
  public static basicUri(propName: string) {
    return [
      (v?: string) => !!v || `${propName} is required`,
      (v: string) =>
        /^https:\/\/.*$/.test(v) ||
        `${propName} must be a valid https:// url (http urls are not allowed)`,
      (v: string) =>
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/.test(
          v
        ) || `${propName} must be a valid url`,
      (v: string) =>
        `${v}`.length < 255 ||
        `${propName} is ${256 - v.length} characters too long`,
    ];
  }
  public static basicIntlTel(propName: string):Array<any> {
    return [
      (v?: string) => !!v || `${propName} is required`,
      (v: string) =>
        /^\+.*$/.test(v) ||
        `${propName} must be a valid international telephone number - eg: +27/+1`,
      (v: string) =>
        /^\+((?:9[679]|8[035789]|6[789]|5[90]|42|3[578]|2[1-689])|9[0-58]|8[1246]|6[0-6]|5[1-8]|4[013-9]|3[0-469]|2[70]|7|1)(?:\W*\d){0,13}\d$/.test(
          v
        ) || `${propName} must be a valid number`,
    ];
  }
  public static basicRequired(propName: string) {
    return [(v?: string) => !!v || `${propName} is required`];
  }
  public static readonly password: Array<any> = [
    (v?: string) => !!v || "Password is required",
    (v: string) =>
      /((.+||)[A-Z](.+||)){2,}/.test(v) ||
      "Min 2 uppercase characters required",
    (v: string) =>
      /((.+||)[a-z](.+||)){2,}/.test(v) ||
      "Min 2 lowercase characters required",
    (v: string) =>
      /((.+||)[0-9](.+||)){1,}/.test(v) || "Min 1 numbers required",
    (v: string) =>
      /((.+||)[!@#$&*_\-+](.+||)){1,}/.test(v) ||
      "Min 1 special characters required (!@#$&*)",
    (v: string) => `${v}`.length >= 8 || "Password min length is 8",
  ];
  public static readonly otp: Array<any> = [
    (v?: string) => !!v || "One time pin is required",
    (v: string) =>
      /^([0-9]){0,6}$/.test(v) || "Number based OTP (6 characters)",
    (v: string) => `${v}`.length === 6 || "OTP Length is 6 characters",
  ];
  public static alwaysErrorMessage(message: string) {
    return [() => message];
  }
}
