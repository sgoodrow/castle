export const log = (message: any) => {
    const now = new Date();
    const utcString = now.toUTCString();
    console.log(`[${utcString}] ${message}`);
};