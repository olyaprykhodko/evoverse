// створимо інтервал, який буде робити пінг кожну мілісекунду
const interval = setInterval(() => {
  console.log('ping');
}, 100);

// через 1 секунду запустимо синхронну блокуючу функцію, яка робить важке обчислення
const timeout = setTimeout(() => {
  console.log(`Blocking calculation started at ${performance.now()}`);

  // перебір усіх простих чисел до limit
  function countPrimes(limit: number): number {
    let count = 0;
    for (let num = 2; num <= limit; num++) {
      let isPrime = true;
      for (let i = 2; i * i <= i; i++) {
        if (num % i === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) count++;
    }
    return count;
  }

  const result = countPrimes(8 ** 11);

  console.log(
    `Blocking calculation ended at ${performance.now()}, result: ${result}`,
  );
}, 1000);

// синхронна функція countPrimes загорнута у setTimeout, тому її виконання блокує основний потік, поки не буде обчислено результат. У консолі ми бачимо спочатку декілька пінгів, час початку, після чого I/O блокується і чекає заврешення виконання операції
