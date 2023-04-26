export interface Options {
  repeatDuration?: number;
}

export const readyActionExecutor = async (
  action: () => Promise<void>,
  options: Options
) => {
  await action().catch(console.error);

  const { repeatDuration } = options;

  if (repeatDuration) {
    setTimeout(async () => {
      await readyActionExecutor(action, options);
    }, repeatDuration);
  }
};
