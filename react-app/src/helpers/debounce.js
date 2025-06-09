export const debounce = (callback, delay) => {
  let timerId;

  return function (...args) {
    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      callback.apply(this, args);
      timerId = null;
    }, delay);
  };
};

export const debouncePeriod = (func, delay, executeEveryNTimes) => {
  let timerId;
  let counter = 0;

  return function (...args) {
    if (timerId) {
      clearTimeout(timerId);
    }

    if (executeEveryNTimes && counter % executeEveryNTimes === 0) {
      func.apply(this, args);
    }

    counter++;

    timerId = setTimeout(() => {
      if (!executeEveryNTimes) {
        func.apply(this, args);
      }

      counter = 0;
      timerId = null;
    }, delay);
  };
};
