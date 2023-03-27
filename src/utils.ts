/* eslint-disable import/no-extraneous-dependencies */
import colors from 'picocolors';

export function buildError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function errorStack(err: Error): string {
  return err.stack ? `\n${err.stack}` : '';
}

export function greenText(str: string): string {
  return colors.green(str);
}

export function redText(str: string): string {
  return colors.red(str);
}
