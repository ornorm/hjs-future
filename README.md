# HJS-FUTURE
> Future classes for the Hubrisjs javascript framework.

Some future classes: Executors, Callable, Future, BlockingQueue, LinkedBlockingQueue, FutureTask, QueueingFuture, CompletionService, ExecutorCompletionService, AbstractExecutorService, AsyncTask and QueuedWork.

## Npm lib installation

Node:

```sh
npm install hjs-future --save
```

## Babel installation

Node:

```sh
npm install --save-dev babel-cli babel-plugin-transform-runtime babel-polyfill babel-preset-env babel-runtime
```

## Webpack installation for web usage

Node:

```sh
npm install --save-dev babel-loader webpack
```

## Table of Contents
* [Usage of executors](#usage-of-executors)
  + [Executor](#create-an-executor)
  + [Execute an anonymous runnable](#execute-an-anonymous-runnable)
  + [Execute a runnable](#execute-a-runnable)
  + [Execution with parameters](#execution-with-parameters)
  + [Custom executors](#custom-parameters)
  + [Serial executor from capacity](#serial-executor-from-capacity)
  + [Serial executor from queue](#serial-executor-from-queue)
  + [Execute serial runnables](#execute-runnables)
  + [Async serial runnables execution](#async-runnables-execution)
  + [Active runnable on serial](#active-runnable-on-serial)
  + [Blocking executor from capacity](#blocking-executor-from-capacity)
  + [Blocking executor from queue](#blocking-executor-from-queue)
  + [Blocking runnables](#blocking-runnables)
  + [Blocking async runnables](#blocking-async-runnables)
  + [Active blocking runnable](#active-blocking-runnable)
  + [Parallel executor](#parallel-executor)
  + [Parallel runnables](#parallel-runnables)
  + [Prefilled parallel runnables](#prefilled-parallel-runnables)
  + [Parallel runnable promise](#parallel-runnable-promise)
  + [Parallel promise result](#parallel-promise-result)
  + [Active parallel runnable](#active-parallel-runnable)
  + [Callable executor factory](#callable-executor-factory)
  + [Single executor factory](#single-executor-factory)
  + [Serial executor factory](#serial-executor-factory)
  + [Blocking executor factory](#blocking-executor-factory)
  + [Parallel executor factory](#parallel-executor-factory)
  + [Task executor factory](#task-executor-factory)
  + [Front task executor factory](#front-task-executor-factory)
  + [Timed task executor factory](#timed-task-executor-factory)
  + [Delayed task executor factory](#delayed-task-executor-factory)
* [Usage of futures and callables](#usage-of-futures-and-callables)
  + [Callable](#callable)
  + [Future from callable](#future-from-callable)
  + [Future from runnable](#future-from-runnable)
  + [Future callable task](#future-callable-task)
  + [Future runnable task](#future-runnable-task)
  + [Cancel a callable task](#cancel-a-callable-task)
  + [Cancel a runnable task](#cancel-a-runnable-task)
  + [Cancel a future task](#cancel-a-future-task)
* [Usage of blocking queue](#usage-of-blocking-queue)
  + [Linked blocking queue](#linked-blocking-queue)
  + [Add](#add)
  + [AddAll](#addAll)
  + [Clear](#clear)
  + [Contains](#contains)
  + [Drain](#drain)
  + [Element](#element)
  + [Offer](#offer)
  + [Peek](#peek)
  + [Timeout Offer](#timeout-offer)
  + [Poll](#poll)
  + [Timeout poll](#timeout-poll)
  + [Put](#put)
  + [Remaining capacity](#remainingCapacity)
  + [Remove](#remove)
  + [Size](#size)
  + [Take](#take)

### Usage of executors
**Executor**'s are objects that executes submitted tasks. They are interfaces that provides a way of decoupling task submission from the mechanics of how each task will be run.

However, the **Executor**'s does not strictly  require that execution be asynchronous. In the simplest case, an executor can run the submitted task immediately.

**SerialExecutor**'s auto execute submitted task

**BlockingExecutor**'s execute submitted task on demand

**ParallelExecutor**'s execute submitted task only when the queue is full

**Executors** is a factory and utility methods for **Executor** classes defined in this module.

**ExecutorService**'s are **Executor**'s implementation that provides methods to manage termination and methods that can produce a **Future** for tracking progress of one or more asynchronous tasks.

###### Executor

```javascript
import {Executor} from 'hjs-future';

// basic abstract executor
const E = new Executor();
```
###### Execute an anonymous runnable

```javascript
import {Executor} from 'hjs-future';

const R = {
  
    run(...params) {
        console.log("executed");
        return null;
    }
    
};

const E = new Executor();

E.execute(R);
```
###### Execute a runnable

```javascript
import {Runnable} from 'hjs-message';
import {Executor} from 'hjs-future';

const R = new Runnable({
  
    run(...params) {
        console.log("executed");
        return null;
    }
    
});

const E = new Executor();

E.execute(R);
```
###### Execution with parameters

```javascript
import {Runnable} from 'hjs-message';
import {Executor} from 'hjs-future';

const R = new Runnable({
  
    run(...params) {
        let opt = params[0];
        console.log("executed");
        if (opt) {
            return opt.data;
        }
        return null;
    }
    
});

const E = new Executor();

let data = E.execute(R, { data: "ok"});

console.log(data);
```
###### Implements a custom runnable

```javascript
import {Runnable} from 'hjs-message';
import {Executor} from 'hjs-future';

// Naive promise runnable implementation
const R = new Runnable({
  
    run(...params) {
        let opt = params[0];
        return new Promise((resolve, reject) => {
            if (opt && opt.data === "data to compute") {
                resolve("ok");
            } else {
                reject("ko");
            }
        });
    }
    
});

const E = new Executor();

// this return a promise that is resolved
E.execute(R, { data: "data to compute" })
        .then((result) => {
            console.log(result);
        })
        .catch((e) => {
            console.log(e);
        });
```
###### Custom executors

```javascript
import {Executor} from 'hjs-future';

const R = {
  
    run(...params) {
        let result = params[0] + " world";
        return result;
    }
    
};

// Naive promise executor implementation
const E = new Executor({
    
    execute(r=null,...params) {
        return new Promise((resolve, reject) => {
            if (r) {
                setTimeout(() => {
                    // make computation
                    resolve(r.run.apply(r, params));
                }, 1000);
            } else {
                reject(new Error("NullPointerException"));
            }
        });
    }
    
});

E.execute(R, "Hello")
        .then((result) => {
            console.log(result === "Hello world");
        })
        .catch((e) => {
            console.log(e);
        });
```

###### Serial executor from capacity

```javascript
import {SerialExecutor} from 'hjs-future';

const capacity = 100;

const S = new SerialExecutor({
    capacity /*max runnable in the queue (default to 10)*/
});
```
###### Serial executor from queue

```javascript

import {RingBuffer} from 'hjs-collection';
import {SerialExecutor} from 'hjs-future';

const CAPACITY = 10;

const queue = new RingBuffer(CAPACITY);

const S = new SerialExecutor({
    queue /*AbstractQueue implementation (default to Queue)*/
});
```
###### Execute serial runnables

```javascript
import {SerialExecutor} from 'hjs-future';

const SE = new SerialExecutor({ capacity });

for (let i=0; i<capacity; i++) {
    // enqueue runnables (this impementation of the execute method return nothing)
    SE.execute({
        run(...params) {
            let index = params[0];
            // sync block code never block the queue
            console.log("executed at index " + index);
            return index;
        }
    }, i);
};

// start queue execution
SE.scheduleNext();
```
###### Async serial runnables execution

```javascript
import {SerialExecutor} from 'hjs-future';

const capacity = 10;

const SE = new SerialExecutor({ capacity });

// runnables creator
const createRunnable = () => {
    return {
        run(...params) {
            // for simplicity put computation on promise
            return new Promise((resolve, reject) => {
                let index = params[0];
                if (index < capacity) {
                    if (index === 4 || index === 7) {
                        // async block code can block the queue
                        setTimeout(() => {
                            resolve("async executed at index " + index);
                        }, index === 4 ? 2000 : 500);
                    } else {
                        // sync block code never block the queue
                        resolve("executed at index " + index);
                    }
                }
            });
        }
    };
};

for (let i=0; i<capacity; i++) {
    // enqueue runnables
    SE.execute(createRunnable(), i);
};

// start queue execution and get all results as a promise
SE.getPromiseResults()
    .then((results) => {
        
        results.forEach((value) => {
            // ordered results
            console.log(value);
        });
        
    })
    .catch((e) => {
        // no error in this example
    });
```
###### Active runnable on serial

```javascript
import {SerialExecutor} from 'hjs-future';

const capacity = 10;

const promises = new Array(capacity);

const SE = new SerialExecutor({ capacity });

for (let i = 0; i < capacity; i++) {
    let p = new Promise((resole, reject) => {
        let first = SE.size() === 0;
        // enqueue a runnable task
        SE.execute({
            run(...params) {
                let index = params[0];
                console.log("executed at index " + index);
                return this.index = index;
            }
        }, i);
        // getting the active runnable
        let active = SE.active();
        // edge case start the queue
        if (first) {
            SE.scheduleNext();
        }
        resole(active);
    });
    promises[i] = p;
}

Promise.all(promises)
    .then((actives) => {
        let results = SE.getResults();
        // getting all runnables that was activated
        actives.forEach((active) => {
            // getting the task runnable that was submit
            let task = active.task;
            // only for validation purpose 
            if (results[active.task.index] === active.task.index) {
                console.log("runnable complete at index " + active.task.index);
            }
        });
    });
```
###### Blocking executor from capacity

```javascript

import {BlockingExecutor} from 'hjs-future';

const capacity = 10;

const S = new BlockingExecutor({
    capacity /*max runnable in the queue (default to 10)*/
});
```
###### Blocking executor from queue

```javascript

import {RingBuffer} from 'hjs-collection';
import {BlockingExecutor} from 'hjs-future';

const CAPACITY = 10;

const queue = new RingBuffer(CAPACITY);

const S = new BlockingExecutor({
    queue /*AbstractQueue implementation (default to Queue)*/
});
```
###### Blocking runnables

```javascript
import {BlockingExecutor} from 'hjs-future';

const capacity = 10;

const BE = new BlockingExecutor({ capacity });

for (let i=0; i<capacity; i++) {
    // enqueue runnables
    BE.execute({
        run(...params) {
            let index = params[0];
            console.log("executed at index " + index);
            // don't forget to execute next task
            BE.scheduleNext();
            return index;
        }
    }, i);
};

// start queue execution and get all results
// Be care full result are in reversed order here, because tasks are enqueued from sub tasks
// last task become first.  
console.log(BE.scheduleNext().getResults());
```
###### Blocking async runnables

```javascript
import {RingBuffer} from 'hjs-collection';
import {BlockingExecutor} from 'hjs-future';

const capacity = 10;

const queue = new RingBuffer(capacity);

const BE = new BlockingExecutor({ queue });

const createRunnable = (executor) => {
    return {
        run(...params) {
            // don't forget to execute next task
            executor.scheduleNext();
            return new Promise((resolve, reject) => {
                let idx = params[0];
                if (idx <= capacity) {
                    if (idx === 4 || idx === 7) {
                        setTimeout(() => {
                            resolve("async executed at index " + idx);
                        }, idx === 4 ? 2000 : 500);
                    } else {
                        resolve("executed at index " + idx);
                    }
                }
            });
        }
    };
};

for (let i=0; i < capacity; i++) {
    BE.execute(createRunnable(BE), i);
}

// start queue execution and get all results as a promise
BE.getPromiseResults()
    .then((results) => {
        console.log(results);
        results.forEach((result) => {
            console.log(result);
        });

    })
    .catch((e) => {
        console.log(e);
    });
```
###### Active blocking runnable

```javascript
import {BlockingExecutor} from 'hjs-future';

const capacity = 10;

const BE = new BlockingExecutor({ capacity });

new Promise((resole, reject) => {

    let actives = [];

    // enqueue a runnable task
    for (let i = 0; i < capacity; i++) {
        BE.execute({
            index: i,
            run(...params) {
                console.log("executed at index " + this.index);
                if (BE.isEmpty()) {
                    resole(actives);
                }
                return "[" + this.index + "]";
            }
        }, i);
    }

    let active = null;

    while(BE.isActive() && (active = BE.active())) {
        actives.push(active);
        // don't forget to execute next task
        BE.scheduleNext();
    }

}).then((actives) => {
    // results are in natural orders
    console.log(BE.getResults());
    // getting all runnables that was activated
    actives.forEach((active) => {
        // getting the task runnable that was submit
        let task = active.task;
        console.log("runnable complete at index " + active.task.index);
    });
});
```
###### Parallel executor

```javascript

import {LinkedList} from 'hjs-collection';
import {ParallelExecutor} from 'hjs-future';

const capacity = 10;

const queue = new LinkedList();

const PE = new ParallelExecutor({
    capacity /*max runnable in the queue (default to 10)*/,
    queue /*AbstractQueue implementation (default to LinkedList)*/
});
```
###### Parallel runnables

```javascript
import {ParallelExecutor} from 'hjs-future';

const capacity = 5;

const PE = new ParallelExecutor({ capacity });

for (let i=0; i<capacity - 1; i++) {
    PE.execute({
        run(...params) {
            console.log("executed at index " + params[0]);
            return params[0];
        }
    }, i);
}

// queue not full
let isFull = PE.isFull(); 

if (!isFull) {
    // when we add the last element the queue is executed
    PE.execute({
        run(...params) {
            console.log("executed at index " + params[0]);
            return params[0];
        }
    }, 4);
}
```
###### Prefilled parallel runnables

```javascript
import {LinkedList} from 'hjs-collection';
import {ParallelExecutor} from 'hjs-future';

const capacity = 5;

const tasks = new Array(capacity);

for (let i=0; i<capacity; i++) {
    tasks[i] = {
        run(...params) {
            console.log("executed at index " + params[0]);
            return params[0];
        }
    };
}

// fill the queue
const queue = new LinkedList(tasks);

// later in the code
const PE = new ParallelExecutor({ capacity, queue });

// here queue is full
PE.executeAll();
```
###### Parallel runnable promise

```javascript
import {Queue} from 'hjs-collection';
import {ParallelExecutor,RunnablePromise} from 'hjs-future';

const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");

const capacity = lorem.length;

const PE = new ParallelExecutor({capacity});

const queue = new Queue(capacity);

lorem.map((word, index) => {
    return new RunnablePromise({

        handlePromise(result) {
            let complete = index === capacity - 1;
            if (queue.offer(result) && complete) {
                let occurence;
                while ((occurence = queue.poll())) {
                    console.log(occurence);
                }
            }
        },

        process(resolve, reject) {
            setTimeout(() => {
                resolve(word + index);
            }, 250);
        }

    });
})
.forEach((runnable) => { 
    PE.execute(runnable); 
});
```
###### Parallel promise result

```javascript
import {ParallelExecutor} from 'hjs-future';

const capacity = 10;

const PE = new ParallelExecutor({ capacity });

const createRunnable = (executor) => {
    return {
        run(...params) {
            return new Promise((resolve, reject) => {
                let idx = params[0];
                if (idx <= capacity) {
                    if (idx === 4 || idx === 7) {
                        setTimeout(() => {
                            resolve("async executed at index " + idx);
                        }, idx === 4 ? 2000 : 500);
                    } else {
                        resolve("executed at index " + idx);
                    }
                }
            });
        }
    };
};

for (let i=0; i < capacity; i++) {
    PE.execute(createRunnable(PE), i);
}

// start queue execution and get all results as a promise
PE.getPromiseResults()
    .then((results) => {
        console.log(results);
        results.forEach((result) => {
            console.log(result);
        });

    })
    .catch((e) => {
        console.log(e);
    });
```
###### Active parallel runnable

```javascript
import {ParallelExecutor} from 'hjs-future';

const capacity = 5;

const PE = new ParallelExecutor({capacity});

const actives = [];

const runnables = [];

for (let i = 0; i < capacity; i++) {
    runnables[i] = {
        index: i,
        resolve: null,
        reject: null,
        run() {
            if (this.resolve) {
                this.resolve(this.index);
            }
        }

    };
}

Promise.all(runnables.map((runnable) => {
    
    return new Promise((resolve, reject) => {
        runnable.resolve = resolve;
        runnable.reject = reject;
        PE.execute(runnable);
        actives.push(PE.active());
    });
    
}))
.then((indexes) => {

    indexes.forEach((value) => {

        let active = actives[value];
        let task = active.task;

        console.log(task.index);

    });

});
```
###### Callable executor factory

```javascript
import {Executors} from 'hjs-future';

// A runnable
let runnable = {
    run() {
        console.log("A task");
    }
};

// An optionnal result
let result = "A default task";

// Create a callable instance
let callable = Executors.callable(runnable, result);
```
###### Single executor factory

```javascript
import {Executors} from 'hjs-future';

let PE = Executors.newSingleExecutor({
    
    execute(r=null,...params) {
        if (r) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // make computation
                    resolve(r.run.apply(r, params));
                }, 1000);         
            });
        }
        return null;
    }
    
});
```
###### Serial executor factory

```javascript
import {Queue} from 'hjs-collection';
import {Executors} from 'hjs-future';

let SE1 = Executors.newSerialExecutor({
    capacity: 10
});

let SE2 = Executors.newSerialExecutor({
    queue: new Queue(10)
});
```
###### Blocking executor factory

```javascript
import {Queue} from 'hjs-collection';
import {Executors} from 'hjs-future';

let BE1 = Executors.newBlockingExecutor({
    capacity: 10
});

let BE2 = Executors.newBlockingExecutor({
    queue: new Queue(10)
});
```
###### Parallel executor factory

```javascript
import {LinkedList} from 'hjs-collection';
import {Executors} from 'hjs-future';

let PE = Executors.newParallelExecutor({
    capacity: 10,
    queue: new LinkedList()
});
```
###### Task executor factory

```javascript
import {MessageHandler} from 'hjs-message';
import {BlockingExecutor, Executors} from "hjs-future";

const capacity = 10;

// Create an executor that post tasks on message handler
const PE = Executors.postExecutor(
    MessageHandler.create(), 
    new BlockingExecutor({ capacity })/*any type of executors accepted if not specified a single executor is used*/
);

// execute runnables on the same executor
for (let i=0; i<capacity; i++) {
    PE.execute({
    
        run(handler, token=null) {
            console.log("executed at index " + token);
            // mark message has handled
            return true;
        }
    
    }, i/* optional  token*/);
}
```
###### Front task executor factory

```javascript
import {MessageHandler} from 'hjs-message';
import {SerialExecutor, Executors} from "hjs-future";

const capacity = 10;

// Create an executor that always post at front of the queue
const PE = Executors.postExecutorAtFrontOfQueue(
    MessageHandler.create(), 
    new SerialExecutor({ capacity })/*any type of executors accepted if not specified a single executor is used*/
);

for (let i=0; i<capacity; i++) {
    PE.execute({
    
        run(handler, token=null) {
            console.log("executed " + token);
            return true;
        }
    
    }, i/* optional  token*/);
}
```
###### Timed task executor factory

```javascript
import {MessageHandler} from 'hjs-message';
import {Executor, Executors} from "hjs-future";

const capacity = 10;

// Post at time executor
const PE = Executors.postExecutorAtTime(
    MessageHandler.create(), 
    new Executor() /*Lite weight executor that haven't internal queue if not specified a single executor is used*/
);

for (let i=0; i<capacity; i++) {

    let START_TIME = Date.now();
    let WAIT_TIME = 200 * (i + 1);
    let UPTIME_MILLIS = START_TIME + WAIT_TIME;

    PE.execute({

        run(handler, token=null) {
            console.log("executed at index " + token);
            let now = Date.now();
            let when = START_TIME;
            let ellapsed = now - when;
            let diff = UPTIME_MILLIS - when;
            console.log("now: " + now + ", when: " + when + ", ellapsed: " + ellapsed + ", diff: " + diff);
            return true;
        }

    }, UPTIME_MILLIS, i);

}
```
###### Delayed task executor factory

```javascript
import {MessageHandler} from 'hjs-message';
import {ParallelExecutor, Executors} from "hjs-future";

const capacity = 10;

// Post at delayed executor
const PE = Executors.postExecutorDelayed(
    MessageHandler.create(), 
    new ParallelExecutor({ capacity })/*any type of executors accepted if not specified a single executor is used*/
);

for (let i=0; i<capacity; i++) {

    let start = Date.now();
    
    let delay = 200 * (i + 1);

    PE.execute({

        run(handler, token=null) {
            console.log("executed at index " + token);
            let now = Date.now();
            let when = start;
            let ellapsed = now - when;
            console.log("now: " + now + ", when: " + when + ", ellapsed: " + ellapsed + ", delay " + delay);
            return true;
        }

    }, delay, i);

}
```
### Usage of futures and callables
**Callable**'s are task that returns a result and may throw an exception. Implementors define a single method called 
**compute**.

**Future**'s represents the result of an asynchronous computation. Methods are provided to check if the computation is 
complete, to wait for its completion, and to retrieve the result of the computation. The result can only be retrieved 
using method **get** when the computation has completed, blocking if necessary until it is ready. Cancellation is 
performed by the **cancel** method. Additional methods are provided to determine if the task completed normally or was 
cancelled. Once a computation has completed, the computation cannot be cancelled. The framework give you a future 
implementation named **FutureTask**.

###### Callable

```javascript
import {time} from "hjs-core";
import {Callable} from "hjs-future";

// basic example that manually start a callable
const C = new Callable({
    /* compute is the only accepted arguments */
    compute() {
        let P = new Promise((resolve, reject) => {
            
            // sleep 2 seconds
           time.SECONDS.sleep(
                
               /* make computation*/
               () => { resolve("ok"); },
               
               /*wait time in seconds in this example*/
               2,
               
               /*Optional exception handler for this time unit*/
               new time.UncaughtExceptionHandler({
                     /*catch any exception (in this example can't appen)*/   
                    uncaughtException(e) {
                        reject(e);
                    }
                       
               })
               
           );
           
        })
        .then((result) => {
            // signal the result
            this.signal(result);
        })
        .catch((e) => {
            // signal this error
            onComplete(e);
        });
    }

});

// listen for computation
C.on(Callable.COMPUTE, (result) => {
    C.removeAllListeners(Callable.COMPUTE);
    console.log(result);
});

// start computation
C.call();
```
###### Future from callable

```javascript
import {Callable,FutureTask} from "hjs-future";

/* create a future task with a Callable instance */
const F1 = new FutureTask({
    
    /*An associated callable instance */
    callable: new Callable({
        compute() {
        }
    }),
    
    /* An optional callback */
    done(result=null) {
    }

});

/* create a future task with an anonymous callable */
const F2 = new FutureTask({
    
    /*An associated anonymous callable */
    callable: {
        compute() {
        }
    }
    
});

/* create a future task with an anonymous computation */
const F23 = new FutureTask({
    
    /*An associated anonymous computation */
    callable: () => {
    }
    
});
```
###### Future from runnable

```javascript
import {Runnable} from "hjs-message";
import {FutureTask} from "hjs-future";

/* create a future task with a Runnable instance */
const F1 = new FutureTask({
    
    /*An optional default result*/
    result: "my default data",
    
    /*An associated runnable instance */
    runnable: new Runnable({
        run(callable) {
        }
    }),
    
    /* An optional callback */
    done(result=null) {
    }

});

/* create a future task with an anonymous runnable */
const F2 = new FutureTask({
    
    /*An associated anonymous runnable */
    runnable: {
        run(callable) {
        }
    }
    
});

/* create a future task with an anonymous computation */
const F23 = new FutureTask({
    
    /*An associated anonymous computation */
    runnable: (callable) => {
    }
    
});
```
###### Future callable task

```javascript
import {time} from "hjs-core";
import {FutureTask} from "hjs-future";

/* create a future task */
const F = new FutureTask({    
    /*An associated callable*/
    callable: {              
        compute() {
              time.MILLISECONDS.sleep(() => {
                  // signal the result
                  this.signal("ok");
              }, 100);
        }
    }
});

/*Execute this task before a timeout of 1 seconds*/
F.get({
    /*The timeout in seconds*/
    timeout: 1,
    /*The time unit is seconds*/
    unit: time.SECONDS,
    /* The completion callback not specified in the constructor but here*/
    done(result) {
        /*If a timeout occur this result is an instanceof error*/
        console.log(result);
    }
});

//somewhere in the code
setTimeout(() => {    
    let x = F.get();    
    // retrieve the callable result
    console.log(x === "ok");    
}, 3000);
```
###### Future runnable task

```javascript
import {time} from "hjs-core";
import {FutureTask} from "hjs-future";

const result = "TEST";

const F = new FutureTask({
    /*Optional default result*/
    result,
    /*An associated runnable*/
    runnable: (callable) => {
          time.MILLISECONDS.sleep(() => {    
              // signal an empty result so the default one is used
              callable.signal();
          }, 100);    
    }
});

/*Execute this task before a timeout of 1 seconds*/
F.get({
    /*The timeout in seconds*/
    timeout: 1,
    /*The time unit is seconds*/
    unit: time.SECONDS,
    /* The completion callback not specified in the constructor but here*/
    done(result) {
        /*If a timeout occur this result is an instanceof error*/
        console.log(result);
    }
});

setTimeout(() => {
    let x = F.get();
    // retrieve the runnable result
    console.log(x === result);
}, 3000);
```
###### Cancel a callable task

```javascript
import {time} from "hjs-core";
import {FutureTask} from "hjs-future";

const F = new FutureTask({
    callable: {
        compute() {
               time.MILLISECONDS.sleep(() => {    
                  // cancel this task
                  this.cancel();
               }, 100);    
         }
    }
});

F.get({
    timeout: 1,
    unit: time.SECONDS,
    done(result) {
        console.log(result);
    }      
});

setTimeout(() => {
    // this is an instanceof error
    let x = F.get();
    // this is false
    console.log(x);
}, 2000);
```
###### Cancel a runnable task

```javascript
import {time} from "hjs-core";
import {FutureTask} from "hjs-future";

const result = "TEST";

const F = new FutureTask({
    result,
    runnable: (callable) => {
          time.MILLISECONDS.sleep(() => {    
             // cancel this task
             callable.cancel();
          }, 100);    
    }
});

F.get({
    timeout: 1,
    unit: time.SECONDS,
    done(result) {
        console.log(result);
    }      
});

setTimeout(() => {
    // this is an instanceof error
    let x = F.get();
    // this is false
    console.log(x === result);
}, 2000);
```
###### Cancel a future task

```javascript
import {time} from "hjs-core";
import {FutureTask} from "hjs-future";

/* create a future task */
const F = new FutureTask({
    callable: {              
        compute() {
              time.SECONDS.sleep(() => {
                  // we can test the cancellation condition but it's a wast of time 
                  // when cancelled a future never receive signal
                  if (!F.isCancelled()) {
                      // signal the result
                      this.signal("ok");
                  }
              }, 1);
        }
    }
});

F.get({
    timeout: 2,
    unit: time.SECONDS,
    done(result) {
        /*The cancellation occur this result is an instanceof error or never called if the get is not called*/
        console.log(result);
    }    
});

//somewhere in the code
setTimeout(() => {
    // cancel the task
    F.cancel();
    // the task is cancelled
    if (F.isCancelled()) {
        // if we call get the done callback is invoked with a cancellation error otherwise nothing is notified 
        F.get();
    }
    
}, 500);
```
### Usage of blocking queue
**BlockingQueue**'s are **AbstractQueue** that additionally supports operations that wait for the queue to become 
non-empty when retrieving an element, and wait for space to become available in the queue when storing an element.

**BlockingQueue** methods come in four forms, with different ways of handling operations that cannot be satisfied 
immediately, but may be satisfied at some point in the future.

**LinkedBlockingQueue** is a **BlockingQueue** implementation based on linked nodes.
This queue orders elements FIFO (first-in-first-out). 
The head of the queue is that element that has been on the queue the longest time.
The tail of the queue is that element that has been on the queue the shortest time. New elements are inserted at the 
tail of the queue, and the queue retrieval operations obtain elements at the head of the queue. Linked queues typically 
have higher throughput than array-based queues but less predictable performance in most concurrent applications.

The optional capacity bound constructor argument serves as a way to prevent excessive queue expansion. The capacity, 
if unspecified, is equal to **Number.MAX_VALUE**. Linked nodes are dynamically created upon each insertion unless this 
would bring the queue above capacity.

###### Linked blocking queue

```javascript
import {LinkedBlockingQueue} from "hjs-future";

// bound to 5 elements
const capacity = 5;

// create the queue
let LBQ = new LinkedBlockingQueue({ capacity });
```
###### Add

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 1;

let LBQ = new LinkedBlockingQueue({ capacity });

// add an element
let added = LBQ.add({ data: "Added"});

// true if the element was added
console.log(added);
```
###### AddAll

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const collection = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const capacity = collection.length;

let LBQ = new LinkedBlockingQueue({ capacity });

// add all elements
let added = LBQ.addAll(collection);

// true if the queue was modified
console.log(added);
```
###### Clear

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const collection = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const capacity = collection.length;

let LBQ = new LinkedBlockingQueue({ capacity });

if (LBQ.addAll(collection)) {
    // clear the queue
    LBQ.clear();   
}
```
###### Contains

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const collection = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const capacity = collection.length;

let LBQ = new LinkedBlockingQueue({ capacity });

// true if the queue was modified && contains the first element
console.log(LBQ.addAll(collection) && LBQ.contains(collection[0]));
```
###### Drain

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const collection = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const capacity = collection.length;

let LBQ = new LinkedBlockingQueue({ capacity });

// true if the queue was modified && contains the first element
console.log(LBQ.addAll(collection) && LBQ.drainTo(new Array(capacity)));
```
###### Element

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const collection = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const capacity = collection.length;

let LBQ = new LinkedBlockingQueue({ capacity });

// true if the queue was modified && contains the first element
console.log(LBQ.addAll(collection) && LBQ.element());
```
###### Offer

```javascript
import {time} from "js-core";
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

let LBQ = new LinkedBlockingQueue({ capacity });

console.log("=========================== OFFER ");

for (let i=0; i<capacity; i++) {

    // offer an element
    let bool = LBQ.offer(i, {
        /* optional timeout (default to 0) */
        timeout: 0,
        /* optional time unit (default to MILLIS) */
        unit: time.MILLIS,
        /* optional callabck */
        callback(node) {
            // on POLL event
            if (node instanceof Error) {
                console.log("--> failed offer to " + i);
                console.error(node);
            } else {
                console.log("--> offer to " + i);
            }
        }
    });
    
    // always true/false
    console.log(bool);
}

// here the queue is full
console.log(LBQ.remainingCapacity() === 0);
```
###### Timeout Offer

```javascript
import {time} from 'js-core';
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

let LBQ = new LinkedBlockingQueue({ capacity });

// overflow 50%
const overflow = Math.floor(capacity / 2);

// buffer size
const bufferOverflow = capacity + overflow;

// timeout
let timeout = 1000;

console.log("=========================== OFFER ");

for (let i=0; i<bufferOverflow; i++) {

    // offer an element
    let bool = LBQ.offer(i, {
        timeout: i > capacity ? timeout : 0,
        callback(node) {
            // on a POLL event
            if (node instanceof Error) {
                console.log("--> failed offer to " + i);
                console.error(node);
            } else {
                console.log("--> offer to " + i);
            }
        }
    });
    
    // the result of the operation (true/false)
    console.log(bool);
    
}

// here the queue is full
console.log(LBQ.remainingCapacity() === 0);
```
###### Peek

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const data = [{ data: "Added0"},{ data: "Added1"},{ data: "Added2"},{ data: "Added3"}];

const LBQ = new LinkedBlockingQueue({ data  });

// the first element
console.log(LBQ.peek().data === "Added0");
```
###### Poll

```javascript
import {time} from "js-core";
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

let LBQ = new LinkedBlockingQueue({ capacity });

console.log("=========================== POLL ");

for (let i=0; i<capacity; i++) {

    // poll an element
    let element = LBQ.poll({
        /* optional timeout (default to 0) */
        timeout: 0,
        /* optional time unit (default to MILLIS) */
        unit: time.MILLISECONDS,
        /* optional callback */
        callback(element) {
            // on OFFER event
            if (element instanceof Error) {
                console.log("--> failed poll from " + i);
                console.error(element);
            } else {
                console.log("--> poll from " + i);
            }
        }
    });
    
    // null element are waiting async completion
    console.log(element === null);
}

// the queue is empty
console.log(LBQ.remainingCapacity() === capacity);
```
###### Timeout poll

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

let LBQ = new LinkedBlockingQueue({ capacity });

// overflow 50%
const overflow = Math.floor(capacity / 2);
// buffer size
const bufferOverflow = capacity + overflow;
// timeout
let timeout = 1000;

console.log("=========================== POLL ");

for (let i=0; i<bufferOverflow; i++) {
    
    // poll an element
    let element = LBQ.poll({
        timeout: i > capacity ? timeout : 0,
        callback(element) {
            // on OFFER event
            if (element instanceof Error) {
                console.log("--> failed poll from " + i);
                console.error(node);
            } else {
                console.log("--> poll from " + i);
            }
        }
    });
    
    // null element are waiting async completion
    console.log(element === null);
}

// the queue is empty
console.log(LBQ.remainingCapacity() === capacity);
```
###### Put

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;
const LBQ = new LinkedBlockingQueue({ capacity  });

let item = { data: "My secret" };

LBQ.put(item, (node=null) => {
    // on POLL event
    if (node instanceof Error) {
        console.log("--> failed put");
        console.error(node);
    } else {
        console.log("--> put node ");
        console.log(node);
    }
});

// the first element
console.log(LBQ.peek().data === "My secret");
```
###### Remaining capacity

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;
const LBQ = new LinkedBlockingQueue({ capacity  });

let item = { data: "My secret" };

LBQ.put(item, (node=null) => {
    // on POLL event
    if (node instanceof Error) {
        console.log("--> failed put");
        console.error(node);
    } else {
        console.log("--> put node ");
        console.log(node);
    }
});

// the first element
console.log(LBQ.peek().remainingCapacity() === 3);
```
###### Remove

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;
const LBQ = new LinkedBlockingQueue({ capacity  });

let item1 = { data: "My secret 1" };
LBQ.put(item1);

let item2 = { data: "My secret 2" };
LBQ.put(item2);

if (LBQ.remove(item2)) {
   console.log(LBQ.peek().data === "My secret 1");    
}
```
###### Size

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;
const LBQ = new LinkedBlockingQueue({ capacity  });

let item = { data: "My secret" };

LBQ.put(item);

// the first element
console.log(LBQ.size() === 1);
```
###### Take

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;
const LBQ = new LinkedBlockingQueue({ capacity  });

let item = { data: "My secret" };

LBQ.put(item);

// the first element
console.log(LBQ.size() === 1);
```
##### Offer and Poll operation (2 way data binding)

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

const overflow = Math.floor(capacity / 2);
const bufferOverflow = capacity + overflow;
const threshold = Math.floor(bufferOverflow / 2);

const LBQ = new LinkedBlockingQueue({ capacity });

console.log("=========================== OFFER ");

for (let i=0; i<bufferOverflow; i++) {
    // offer an element or wait until the next POLL event
    let full = LBQ.offer(i, {
        callback(element=null) {
            if (element instanceof Error) {
                console.log("--> failed offer to " + i);
                console.error(err);
            } else {
                console.log("--> offer to " + i);
            }
        }
    });
}

// wakeup operation
setTimeout(() => {

    console.log("=========================== POLL ");
    
    for (let i=0; i<threshold; i++) {
        // poll an element or wait until the next OFFER event
        let polled = LBQ.poll({
            callback(node, err=null) {
                if (err) {
                    console.log("--> failed poll from " + i);
                    console.error(err);
                } else {
                    console.log("--> poll to " + i);
                }
            }
        });
    }

}, 500);
```
##### Offer and Poll with delay operation (2 way data binding)

```javascript
import {LinkedBlockingQueue} from "hjs-future";

const capacity = 4;

const overflow = Math.floor(capacity / 2);
const bufferOverflow = capacity + overflow;
const threshold = Math.floor(bufferOverflow / 2);
const timeout = 1000;

const LBQ = new LinkedBlockingQueue({ capacity });

console.log("=========================== OFFER ");

for (let i=0; i<bufferOverflow; i++) {
    // offer an element or wait until the next POLL event
    let full = LBQ.offer(i, {
        timeout: i > capacity ? timeout : 0,
        callback(element=null) {
            if (element instanceof Error) {
                console.log("--> failed offer to " + i);
                console.error(err);
            } else {
                console.log("--> offer to " + i);
            }
        }
    });
    
    console.log(full);
}

// wakeup before poll operation
setTimeout(() => {

    console.log("=========================== POLL ");
    
    for (let i=0; i<threshold; i++) {
        // poll an element or wait until the next OFFER event
        let polled = LBQ.poll({
            timeout: i > capacity ? timeout : 0,
            callback(node, err=null) {
                if (err) {
                    console.log("--> failed poll from " + i);
                    console.error(err);
                } else {
                    console.log("--> poll to " + i);
                }
            }
        });
    }

}, 500);
```
## Usage of executor services

**AbstractExecutorService**'s provides an abstract implementation of **ExecutorService**'s execution methods. This class 
implements the **submit**, **invokeAny** and **invokeAll** methods using a **RunnableFuture** returned by 
**newTaskFor**, which defaults to the **FutureTask** class provided in this module.
 
**ExecutorCompletionService** uses a supplied **Executor** to execute tasks. This class arranges that submitted tasks 
are, upon completion, placed on a queue accessible using **take**. The class is lightweight enough to be suitable for 
transient use when processing groups of tasks.

**PoolExecutorService** is an **ExecutorService** that executes each submitted task using one of possibly several pooled 
futures. 

Executor service pools address two different problems: 
1. They usually provide improved performance when executing large numbers of
asynchronous tasks, due to reduced per-task invocation overhead.
2. They provide a means of bounding and managing the 
resources, including futures, consumed when executing a collection of tasks.
Each **PoolExecutorService** also maintains some basic statistics, such as the number of completed tasks.
To be useful across a wide range of contexts, this class provides many adjustable parameters and extensibility hooks.
###### Create an abstract executor service

```javascript
import {AbstractExecutorService} from "hjs-future";

const AES = new AbstractExecutorService();
```
###### Submit tasks on an abstract executor service

```javascript
import {time} from "hjs-core";
import {Queue} from "hjs-collection";
import {AbstractExecutorService} from "hjs-future";

const capacity = 10;

const Q = new Queue(capacity);

const AES = new AbstractExecutorService();

for (let i=0; i<capacity; i++) {
    
    // submit a callable and return a future for later execution
    let future = AES.submit({
        callable: {
            compute() {
                const sleep = Math.floor(Math.random() * 5) + 1;
                time.SECONDS.sleep(() => {
                    this.signal(i + " callable computed randomly at " + sleep + "s");
                }, sleep);
            }
        }
    });
    
    // add in the queue for later execution
    if (!Q.offer(future)) {
        console.log("Queue full");
    }
    
}

let future = null;

// later in the code
while((future = Q.poll())) {
    
    // execute the future task
    future.get({
        timeout: 4,
        unit: time.SECONDS,
        done(result) {
            console.log("[done: " + this.isDone() + ", cancelled: " + this.isCancelled() + "]");
            console.log(result);
        }
    });
    
}
```
###### Invoke all tasks on an abstract executor service

```javascript
import {time} from "hjs-core";
import {AbstractExecutorService} from "hjs-future";

const capacity = 10;

// list of callables
const callables = new Array(capacity);

// create an abstract executor service implementation
const AES = new AbstractExecutorService();

for (let i=0; i<capacity; i++) {
    // fill the list with callables
    callables[i] = {
        compute() {
            const sleep = Math.floor(Math.random() * 5) + 1;
            // some tasks can't termine the work before the executor service timeout
            time.SECONDS.sleep(() => {
                this.signal("At index " + i + " a callable is computed randomly after " + sleep + "s");
            }, sleep);
        }
    };
}

// Invoke all the task waiting either if all tasks are terminated before the timeout or not
AES.invokeAll({
    /* The list of callables tasks to submit */
    tasks: callables,
    /* The maximum time to wait before consider that a task is in timeout here in seconds */
    timeout: 3,
    /* The time unit here in seconds */
    unit: time.SECONDS,
    /* The completion callback that return all submited tasks that are complete or not */
    onInvoke(futures) {
        // Grab the results all elements are futures
        futures.forEach((future) => {
            console.log("***********");
            // If a task is out of range its not done and mark as cancelled
            console.log("[done: " + future.isDone() + ", cancelled: " + future.isCancelled() + "]");
            // If a task enter timeout is result is an instanceof error
            console.log(future.get());
        });

    }

});
```
## Contacts

[Aime - abiendo@gmail.com](abiendo@gmail.com)

Distributed under the MIT license. See [``LICENSE``](./LICENSE.md) for more information.