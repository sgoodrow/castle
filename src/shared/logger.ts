export const log = (message: unknown) => {
    const now = new Date();
    const utcString = now.toUTCString();
    console.log(`[${utcString}] ${message}`);
};