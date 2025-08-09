export const log = (message: string) => {
  const now = new Date();
  const utcString = now.toUTCString();
  console.log(`[${utcString}] ${message}`);
};
