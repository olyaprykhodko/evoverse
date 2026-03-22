console.log('A — sync'); // 1 — синхронний код, виконується одразу

setTimeout(() => console.log('B — setTimeout'), 0); // 6 — macrotask, потрапляє у чергу timers фази event loop

setImmediate(() => console.log('C — setImmediate')); // 7 — macrotask, потрапляє у чергу check фази event loop

process.nextTick(() => console.log('D — nextTick')); // 3 — microtask (nextTick queue), найвищий пріоритет серед microtasks

Promise.resolve().then(() => console.log('E — promise.then')); // 4 — microtask (promise queue), після nextTick

queueMicrotask(() => console.log('F — queueMicrotask')); // 5 — microtask (promise queue), після E бо додано пізніше

console.log('G — sync'); // 2 — синхронний код, виконується одразу

// CJS порядок (стандартний):
// A — sync
// G — sync
// D — nextTick
// E — promise.then
// F — queueMicrotask
// B — setTimeout
// C — setImmediate

// Порядок microtasks: nextTick queue ЗАВЖДИ перед promise queue.
// setTimeout та setImmediate: порядок між ними не гарантований коли обидва заплановані з main module (залежить від швидкості системного таймера). Але всередині I/O callback — setImmediate завжди перший.
