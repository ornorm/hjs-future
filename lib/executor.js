/** @babel */
import {MILLISECONDS} from 'hjs-core/lib/time';
import {LinkedList} from 'hjs-collection/lib/list';
import {Queue} from 'hjs-collection/lib/queue';
import {RunnableAdapter} from './future';

export class Executor {

    constructor({execute = null} = {}) {
        if (execute) {
            this.execute = execute;
        }
    }

    execute(r, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        if (!r.run) {
            throw new TypeError("Not a runnable object");
        }
        return r.run.apply(r, params);
    }

}

export class ExecutorService extends Executor {

    constructor() {
        super();
    }

    awaitTermination({ timeout = 0, unit = MILLISECONDS, callback=null } = {}) {
        return false;
    }

    invokeAll({ tasks, timeout = 0, unit = MILLISECONDS, callback=null } = {}) {
        return null;
    }

    invokeAny({ tasks, ecs=null, timeout = 0, unit = MILLISECONDS, callback=null } = {}) {
        return null;
    }

    isShutdown() {
        return false;
    }

    isTerminated() {
        return false;
    }

    shutdown() {
    }

    shutdownNow() {
        return null;
    }

    submit({ callable = null, runnable = null, result = null, done = null } = {}) {
        return null;
    }
}

export class SerialExecutor extends Executor {

    constructor({capacity = 10, queue = null} = {}) {
        super();
        if (queue) {
            this.mTasks = queue;
        } else {
            this.mTasks = new Queue(capacity);
        }
        this.mResults = [];
        this.mActive = null;
    }

    active() {
        if (this.mTasks) {
            return this.mTasks.peek();
        }
        return null;
    }

    execute(r=null, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        if (!r.run) {
            throw new TypeError("Not a runnable object");
        }
        if (this.isEmpty()) {
            this.mResults = [];
        }
        if (this.mTasks.offer({
                get task() { return r; },
                run: () => {
                    try {
                        this.mResults.push(r.run.apply(r, params));
                    } catch (e) {
                        console.error(e);
                    } finally {
                        this.scheduleNext();
                    }
                }
            }) &&
            this.mActive) {
            return this.scheduleNext();
        }
        return this;
    }

    getPromiseResults() {
        return Promise.all(this.scheduleNext().getResults());
    }

    getResults() {
        return this.mResults;
    }

    isActive() {
        return this.active() !== null;
    }

    isEmpty() {
        if (this.mTasks) {
            return this.mTasks.isEmpty();
        }
        return true;
    }

    isBlocked() {
        return !(this.isEmpty() && this.isActive());
    }

    scheduleNext() {
        if ((this.mActive = this.mTasks.poll()) !== null) {
            try {
                this.mActive.run();
            } catch (e) {
                console.log(e);
            }
        }
        return this;
    }

    size() {
        if (this.mTasks) {
            return this.mTasks.size();
        }
        return 0;
    }

    unblock() {
        if (this.isBlocked()) {
            this.scheduleNext();
        }
    }

}

export class BlockingExecutor extends SerialExecutor {

    constructor({capacity = 10, queue = null} = {}) {
        super({capacity, queue});
    }

    execute(r=null, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        if (!r.run) {
            throw new TypeError("Not a runnable object");
        }
        if (this.isEmpty()) {
            this.mResults = [];
        }
        if (this.mTasks.offer({
                get task() { return r; },
                run: () => {
                    try {
                        this.mResults.push(r.run.apply(r, params));
                    } catch (e) {
                        console.log(e);
                    }
                }
            }) && this.mActive) {
            return this.scheduleNext();
        }
        return this;
    }

}

export class ParallelExecutor extends Executor {

    constructor({capacity = 10, queue = new LinkedList()} = {}) {
        super();
        this.mResults = [];
        this.mActive = null;
        this.mTasks = queue;
        this.mCapacity = capacity;
    }

    active() {
        if (this.mActive) {
            return this.mActive;
        }
        return null;
    }

    execute(r=null, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        if (!r.run) {
            throw new TypeError("Not a runnable object");
        }
        if (this.mActive) {
            this.mActive = null;
        }
        if (this.isEmpty()) {
            this.mResults = [];
        }
        let task = {
            get task() { return r; },
            run: () => {
                try {
                    this.mResults.push(r.run.apply(r, params));
                } catch (e) {
                    console.error(e);
                }
            }
        };
        this.mActive = task;
        let rejected = !this.mTasks.offer(task);
        this.executeAll();
        if (rejected) {
            this.mTasks.offer(task);
        }
        return this;
    }

    executeAll() {
        if (this.isFull()) {
            let r = null;
            while ((r = this.mTasks.poll())) {
                try {
                    r.run();
                } catch (e) {
                    console.log(e);
                }
            }
        }
        return this;
    }

    getPromiseResults() {
        return Promise.all(this.getResults());
    }

    getResults() {
        return this.mResults;
    }

    isActive() {
        return this.active() !== null;
    }

    isBlocked() {
        return !this.isFull();
    }

    isEmpty() {
        if (this.mTasks) {
            return this.mTasks.isEmpty();
        }
        return true;
    }

    isFull() {
        return this.mTasks.size() === this.mCapacity;
    }

    size() {
        if (this.mTasks) {
            return this.mTasks.size();
        }
        return 0;
    }

}

const wrapExecutor = (executor, r, handler, token=null) => {
    executor.execute(r, handler, token);
    let hasResult = executor instanceof SerialExecutor || executor instanceof ParallelExecutor;
    if (hasResult) {
        if (executor instanceof SerialExecutor) {
            if (executor instanceof BlockingExecutor) {
                executor.scheduleNext();
            } else {
                if (executor.size() === 1) {
                    executor.scheduleNext();
                }
            }
        }
        let results = executor.getResults();
        return results[0];
    }
    return true;
};

export class Executors {

    constructor() {
    }

    static callable(task, result=null) {
        if (!task) {
            throw new ReferenceError("NullPointerException");
        }
        return new RunnableAdapter({task, result});
    }

    static postExecutor(handler, executor=null) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        if (!executor) {
            return Executors.newPostExecutor(handler);
        }
        return Executors.newSingleExecutor((r, token = null) => {
            return handler.post({
                run: (handler, token=null) => {
                    return wrapExecutor(executor, r, handler, token);
                }
            }, token);
        });
    }

    static postExecutorAtFrontOfQueue(handler, executor=null) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        if (!executor) {
            return Executors.newPostAtFrontOfQueueExecutor(handler);
        }
        return Executors.newSingleExecutor((r, token=null) => {
            return handler.postAtFrontOfQueue({
                run: (handler, token=null) => {
                    return wrapExecutor(executor, r, handler, token);
                }
            }, token);
        });
    }

    static postExecutorAtTime(handler, executor) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        if (!executor) {
            return Executors.newPostAtTimeExecutor(handler);
        }
        return Executors.newSingleExecutor((r, uptimeMillis = 0, token=null) => {
            return handler.postAtTime({
                run: (handler, token=null) => {
                    return wrapExecutor(executor, r, handler, token);
                }
            }, uptimeMillis, token);
        });
    }

    static postExecutorDelayed(handler, executor=null) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        if (!executor) {
            return Executors.newPostDelayedExecutor(handler);
        }
        return Executors.newSingleExecutor((r, delayMillis = 0, token = null) => {
            return handler.postDelayed({
                run: (handler, token=null) => {
                    return wrapExecutor(executor, r, handler, token);
                }
            }, delayMillis, token);
        });
    }

    static newParallelExecutor({capacity = 0, queue = new LinkedList()} = {}) {
        return new ParallelExecutor({capacity, queue});
    }

    static newPostExecutor(handler) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        return Executors.newSingleExecutor((r, token=null) => {
            return handler.post(r, token);
        });
    }

    static newPostAtFrontOfQueueExecutor(handler, token = null) {
        if (!handler) {
            throw new ReferenceError("NullPointerException");
        }
        return Executors.newSingleExecutor((r, token = null) => {
            return handler.postAtFrontOfQueue(r, token);
        });
    }

    static newPostAtTimeExecutor(handler, uptimeMillis = 0, token = null) {
        if (handler === null) {
            throw new ReferenceError("NullPointerException");
        }
        return Executors.newSingleExecutor((r, uptimeMillis = 0, token = null) => {
            return handler.postAtTime(r, uptimeMillis, token);
        });
    }

    static newPostDelayedExecutor(handler, delayMillis = 0, token = null) {
        if (handler === null) {
            throw new ReferenceError("NullPointerException");
        }
        return Executors.newSingleExecutor((r, delayMillis = 0, token = null) => {
            return handler.postDelayed(r, delayMillis, token);
        });
    }

    static newSingleExecutor(execute) {
        return new Executor({execute});
    }

    static newSerialExecutor({capacity = 0, queue = null} = {}) {
        return new SerialExecutor({capacity, queue});
    }

    static newBlockingExecutor({capacity = 0, queue = null} = {}) {
        return new BlockingExecutor({capacity, queue});
    }

}
