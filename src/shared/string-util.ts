export const replaceAll = (str: string, find: string, replace: string) =>
  str.replace(new RegExp(find, "g"), replace);
