import { ApiException } from '@/lib/errors';
import { Either, Left, Right } from './either';

export type Result<T, E = Error> = Either<E, T>;
export type ResultVoid<E = Error> = Either<E, void>;
export type ResultAsync<T, E = ApiException> = Promise<Either<E, T>>;

export const right = <T>(value: T): Right<T> => Right.of(value);
export const rightVoid = (): Right<void> => Right.void();
export const left = <E>(error: E): Left<E> => Left.of(error);

export async function wrapAsync<T>(promise: Promise<T>): ResultAsync<T> {
  try {
    const data = await promise;
    return right(data);
  } catch (err: unknown) {
    const apiError = err instanceof ApiException ? err : ApiException.convertAny(err);

    return left(apiError);
  }
}
