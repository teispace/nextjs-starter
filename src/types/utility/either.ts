export class Left<L> {
  readonly tag = 'left' as const;
  readonly value: L;

  private constructor(value: L) {
    this.value = value;
  }

  static of<L>(value: L): Left<L> {
    return new Left(value);
  }

  isLeft(): this is Left<L> {
    return true;
  }

  isRight(): this is Right<never> {
    return false;
  }

  map<R>(_fn: (r: never) => R): Left<L> {
    return this;
  }

  mapLeft<NL>(fn: (l: L) => NL): Left<NL> {
    return Left.of(fn(this.value));
  }

  fold<T>(onLeft: (l: L) => T, _onRight: (r: never) => T): T {
    return onLeft(this.value);
  }
}

export class Right<R> {
  readonly tag = 'right' as const;
  readonly value: R;

  private constructor(value: R) {
    this.value = value;
  }

  static of<R>(value: R): Right<R> {
    return new Right(value);
  }

  static void(): Right<void> {
    return new Right(undefined);
  }

  isLeft(): this is Left<never> {
    return false;
  }

  isRight(): this is Right<R> {
    return true;
  }

  map<NR>(fn: (r: R) => NR): Right<NR> {
    return Right.of(fn(this.value));
  }

  mapLeft<NL>(_fn: (l: never) => NL): Right<R> {
    return this;
  }

  fold<T>(_onLeft: (l: never) => T, onRight: (r: R) => T): T {
    return onRight(this.value);
  }
}

export type Either<L, R> = Left<L> | Right<R>;
