/** @babel */
import {MILLISECONDS} from 'hjs-core/lib/time';
import {Runnable} from 'hjs-message/lib/handler';
import {Executor, Executors, ExecutorService} from './executor';
import {Callable, Future, FutureState, RunnableFuture} from './future';
import {LinkedBlockingQueue} from './queue';

export class FutureTask extends RunnableFuture {

    constructor({done = null, callable = null, runnable = null, result = null} = {}) {
        super();
        this.mWaitId = -1;
        this.mState = FutureState.NEW;
        if (callable) {
            if (callable instanceof Callable) {
                this.mCallable = callable;
            } else if (callable.compute) {
                this.mCallable = new Callable(callable);
            } else if (typeof callable === "function") {
                this.mCallable = new Callable({compute: callable});
            } else {
                throw new TypeError("IllegalArgumentsException not a callable type");
            }
        } else if (runnable) {
            if (runnable instanceof Runnable) {
                this.mCallable = Executors.callable(runnable, result);
            } else if (runnable.run) {
                this.mCallable = Executors.callable(runnable, result);
            } else if (typeof runnable === "function") {
                this.mCallable = Executors.callable({run: runnable}, result);
            } else {
                throw new TypeError("IllegalArgumentsException not a runnable type");
            }
        } else {
            throw new ReferenceError('NullPointerException');
        }
        if (done) {
            this.done = done;
        }
    }

    awaitDone() {
        let s = this.mState;
        let done = s === FutureState.COMPLETING;
        if (done) {
            this.set(this.report(s));
        } else {
            switch (s) {
                case FutureState.NORMAL:
                    this.mState = FutureState.COMPLETING;
                    this.set(this.report(s));
                    break;
                case FutureState.EXCEPTIONAL:
                    this.setException(this.mOutcome);
                    break;
                case FutureState.CANCELLED:
                    this.report(s);
                    break;
                case FutureState.INTERRUPTED:
                    this.report(s);
                    break;
            }
        }
    }

    cancel(mayInterruptIfRunning = false) {
        if (this.mState === FutureState.NORMAL) {
            return false;
        }
        let isNew = this.mState === FutureState.NEW;
        this.mState = mayInterruptIfRunning ?
            FutureState.INTERRUPTING :
            FutureState.CANCELLED;
        if (isNew) {
            return false;
        }
        this.compute();
        return true;
    }

    compute(result) {
        this.finalize();
        let s = this.mState;
        if (s >= FutureState.INTERRUPTING) {
            this.setInterrupted(s);
        } else if (s >= FutureState.CANCELLED) {
            this.setCancelled(s);
        } else {
            this.set(result);
        }
    }


    static create({callable = null, runnable = null, result = null, done = null} = {}) {
        if (!callable && !runnable) {
            throw new ReferenceError("NullPointerException");
        }
        return new FutureTask({callable, runnable, result, done});
    }


    done(result = null) {
    }

    finalize() {
        if (this.mCallable) {
            this.mCallable.removeAllListeners(Callable.COMPUTE);
            this.mCallable.removeAllListeners(Callable.CANCEL);
        }
        if (this.mWaitId > -1) {
            clearTimeout(this.mWaitId);
            this.mWaitId = -1;
        }
    }

    finishCompletion() {
        this.emit(Future.DONE, this.mOutcome);
        this.done(this.mOutcome);
        this.mCallable = null;
    }

    get({timeout = 0, unit = MILLISECONDS, done = null} = {}) {
        if (done) {
            this.on(Future.DONE, (result = null) => {
                this.removeAllListeners(Future.DONE);
                done(result);
            });
        }
        this.run();
        let s = this.mState;
        if (s <= FutureState.COMPLETING) {
            let millis = unit.toMillis(timeout);
            if (millis > 0) {
                this.mWaitId = setTimeout(() => {
                    this.finalize();
                    let s = this.mState;
                    if (s === FutureState.CANCELLED) {
                        this.setCancelled();
                    } else {
                        this.mState = FutureState.INTERRUPTING;
                        this.setInterrupted();
                    }
                }, millis);
            }
            return null;
        }
        try {
            return this.report(this.mState);
        } catch (ex) {
            this.setException(ex);
            return ex;
        }
    }

    handlePossibleCancellationInterrupt(s) {
        if (s === FutureState.INTERRUPTING) {
            this.mState = FutureState.INTERRUPTED;
        }
    }

    isCancelled() {
        return this.mState >= FutureState.CANCELLED;
    }

    isDone() {
        return this.mState === FutureState.NORMAL;
    }

    isInterrupted() {
        return this.mState >= FutureState.INTERRUPTING;
    }

    report(s) {
        let x = this.mOutcome;
        if (s === FutureState.NORMAL) {
            return x;
        }
        if (s >= FutureState.CANCELLED) {
            throw new RangeError("CancellationException");
        }
        if (s >= FutureState.INTERRUPTING) {
            throw new RangeError("InterruptedException");
        }
        throw new EvalError("ExecutionException " + x);
    }

    run() {
        let isNew = this.mState === FutureState.NEW;
        if (isNew) {
            let callable = this.mCallable;
            if (callable) {
                try {
                    this.mState = FutureState.COMPLETING;
                    callable.on(Callable.COMPUTE, (result) => {
                        this.compute(result);
                    });
                    callable.on(Callable.CANCEL, () => {
                        this.cancel();
                    });
                    callable.call();
                } catch (ex) {
                    this.setException(ex);
                }
            }
        }
    }

    set(v) {
        if (this.mState === FutureState.COMPLETING) {
            this.mOutcome = v;
            this.mState = FutureState.NORMAL;
            this.finishCompletion();
        }
    }

    setException(ex, isException = true) {
        if (this.mState === FutureState.NEW ||
            this.mState === FutureState.COMPLETING ||
            this.mState === FutureState.NORMAL ||
            this.mState === FutureState.CANCELLED ||
            this.mState === FutureState.INTERRUPTING ||
            this.mState === FutureState.INTERRUPTED) {
            this.mOutcome = ex;
            if (isException) {
                this.mState = FutureState.EXCEPTIONAL;
            }
            this.finishCompletion();
        }
    }

    setCancelled() {
        try {
            this.awaitDone();
        } catch (ex) {
            this.setException(ex, false);
        }
    }

    setInterrupted(s = FutureState.INTERRUPTING) {
        try {
            this.handlePossibleCancellationInterrupt(s);
            this.awaitDone();
        } catch (ex) {
            this.setException(ex, false);
        }
    }

}

export class CompletionService {

    constructor() {
    }

    newTaskFor({callable = null, runnable = null, result = null, done = null} = {}) {
        return null;
    }

    poll({timeout = 0, unit = MILLISECONDS, callback = null} = {}) {
        return null;
    }

    submit({timeout = 0, unit = MILLISECONDS, callable = null, runnable = null, result = null, done = null} = {}) {
        return null;
    }

    take(callback = null) {
        return null;
    }

}

export class ExecutorCompletionService extends CompletionService {

    constructor({executor = null, capacity = Number.MAX_VALUE, queue = null} = {}) {
        super();
        this.mExecutor = executor ? executor : new Executor();
        this.mCompletionQueue = queue ? queue : new LinkedBlockingQueue({capacity});
        this.mAes = (queue instanceof AbstractExecutorService) ? queue : null;
    }

    newTaskFor({callable = null, runnable = null, result = null, done = null} = {}) {
        if (this.mAes) {
            return this.mAes.newTaskFor({callable, runnable, result, done});
        }
        return FutureTask.create({callable, runnable, result, done});
    }

    poll({
        timeout = 0,
        unit = MILLISECONDS,
        callback = null
    } = {}) {
        return this.mCompletionQueue.poll({timeout, unit, callback});
    }

    submit({
        timeout = 0,
        unit = MILLISECONDS,
        callable = null,
        runnable = null,
        result = null,
        done = null
    } = {}) {

        let future = null;

        if (callable || runnable) {
            future = this.newTaskFor({callable, runnable, result});
        } else {
            throw new ReferenceError("NullPointerException");
        }

        this.mCompletionQueue.offer(future, {
            callback: (item = null) => {
                if (item instanceof Error) {
                    done(item);
                } else {
                    this.mExecutor.execute(item, timeout, unit, done);
                }
            }

        });

        return future;

    }

    take(callback = null) {
        return this.mCompletionQueue.take(callback);
    }

}

const cancelAll = (futures, index = 0) => {
    let f = null;
    let len = futures.length;
    for (const f of futures) {
        if (f && !f.isDone() && !f.isCancelled()) {
            f.cancel();
        }
    }
};


export class AbstractExecutorService extends ExecutorService {

    constructor() {
        super();
    }

    execute(r, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        let timeout, unit, done;
        if (r instanceof Future) {
            timeout = params[0] || 0;
            unit = params[1] || MILLISECONDS;
            done = params[2];
            r.get({timeout, unit, done});
            return r;
        } else if (r.runnable) {
            timeout = r.timeout || 0;
            unit = r.unit || MILLISECONDS;
            done = r.done;
            r = r.runnable;
            r.get({timeout, unit, done});
            return r;
        }
        return super.execute.apply(this, Array.from(arguments));
    }

    invokeAll({tasks, timeout = 0, unit = MILLISECONDS, done = null} = {}) {

        if (!tasks || !Array.isArray(tasks) || tasks.length < 1) {
            throw new RangeError("IllegalArgumentException");
        }

        const completeTasks = [];

        let futures = tasks.map(callable => {

            let future = this.submit({
                callable,
                timeout,
                unit,
                done(result = null) {
                    completeTasks.push(future);
                    if (completeTasks.length === tasks.length) {
                        done(completeTasks);
                        cancelAll(futures);
                    }
                }
            });

        });

        if (completeTasks.length === tasks.length) {
            done(completeTasks);
            cancelAll(futures);
        }

        return futures;

    }

    invokeAny({
        tasks,
        timeout = 0,
        unit = MILLISECONDS,
        done = null
    } = {}) {

        if (!tasks || !Array.isArray(tasks) || tasks.length < 1) {
            throw new RangeError("IllegalArgumentException");
        }

        let completeTask = false;

        const futures = tasks.map((callable, index) => {

            return this.submit({
                callable,
                timeout,
                unit,
                done(result = null) {
                    if (!completeTask) {
                        let complete = index === tasks.length - 1;
                        if (result instanceof Error) {
                            if (complete) {
                                completeTask = true;
                            }
                        } else {
                            completeTask = true;
                        }
                        if (completeTask) {
                            done(result);
                            cancelAll(futures);
                        }
                    }
                }
            });

        });

        return futures;
    }

    newTaskFor({callable = null, runnable = null, result = null, done = null} = {}) {
        return FutureTask.create({callable, runnable, result, done});
    }

    submit({
        timeout = 0,
        unit = MILLISECONDS,
        callable = null,
        runnable = null,
        result = null,
        done = null
    } = {}) {

        let future = runnable instanceof Future ?
            runnable :
            this.newTaskFor({callable, runnable, result});

        return this.execute(future, timeout, unit, done);
    }

}

const COUNT_BITS = 32 - 3;
const CAPACITY = (1 << COUNT_BITS) - 1;

const RUNNING = -1 << COUNT_BITS;
const SHUTDOWN = 0 << COUNT_BITS;
const STOP = 1 << COUNT_BITS;
const TIDYING = 2 << COUNT_BITS;
const TERMINATED = 3 << COUNT_BITS;

export class PoolExecutorService extends AbstractExecutorService {

    constructor({
        corePoolSize = 8,
        maximumPoolSize = 0,
        allowCoreTimeOut = false,
        keepAliveTime = 0,
        unit = MILLISECONDS,
        afterExecute = null,
        beforeExecute = null,
        onShutdown = null,
        reject = null,
        terminated = null
    }={}) {

        super();

        if (corePoolSize < 0 || keepAliveTime < 0) {
            throw new RangeError("IllegalArgumentException");
        }
        this.mWorkers = [];
        this.mState = RUNNING;
        this.mCorePoolSize = corePoolSize;
        this.maximumPoolSize = maximumPoolSize;
        if (this.maximumPoolSize <= 0 || this.maximumPoolSize < this.corePoolSize) {
            throw new RangeError("IllegalArgumentException");
        }
        this.mAllowCoreTimeOut = allowCoreTimeOut;
        this.mKeepAliveTime = unit.toMillis(keepAliveTime);
        this.mCompletedTaskCount = this.mLargestPoolSize = 0;
        this.mWorkQueue = new LinkedBlockingQueue({capacity: corePoolSize});
        if (afterExecute) {
            this.afterExecute = afterExecute;
        }
        if (beforeExecute) {
            this.beforeExecute = beforeExecute;
        }
        if (onShutdown) {
            this.onShutdown = onShutdown;
        }
        if (reject) {
            this.reject = reject;
        }
        if (terminated) {
            this.terminated = terminated;
        }
    }

    get allowCoreTimeOut() {
        return this.mAllowCoreTimeOut;
    }

    set allowCoreTimeOut(value) {
        if (value && this.keepAliveTime < 0) {
            throw new RangeError("IllegalArgumentException Core threads must have nonzero keep alive times");
        }
        if (value !== this.mAllowCoreTimeOut) {
            this.mAllowCoreTimeOut = value;
        }
    }

    get corePoolSize() {
        return this.mCorePoolSize;
    }

    set corePoolSize(corePoolSize) {
        if (corePoolSize < 0) {
            throw new RangeError("IllegalArgumentException");
        }
        let delta = corePoolSize - this.mCorePoolSize;
        this.mCorePoolSize = corePoolSize;
        if (this.poolSize > corePoolSize) {
            this.interruptIdleFutures(corePoolSize);
        } else if (delta > 0) {
            let k = Math.min(delta, this.mWorkQueue.size());

            /*
             while (k-- > 0 && this.push(null, true)) {
             if (this.mWorkQueue.isEmpty()) {
             break;
             }
             }
             */
        }
    }

    get donePoolSize() {
        return this.mCompletedTaskCount;
    }

    get idlePoolSize() {
        let n = 0;
        for (const w of this.mWorkers) {
            n += (!w.isDone() && !m.isCancelled()) ? 1 : 0;
        }
        return n;
    }

    get keepAliveTime() {
        return this.mKeepAliveTime;
    }

    get largestPoolSize() {
        return this.mLargestPoolSize;
    }

    set largestPoolSize(value) {
        if (this.mLargestPoolSize < value) {
            this.mLargestPoolSize = value;
        }
    }

    get maximumPoolSize() {
        return this.mMaximumPoolSize;
    }

    set maximumPoolSize(value) {

        if (isNaN(value) || value === 0) {
            value = this.corePoolSize + (Math.floor(this.corePoolSize / 2));
        }

        if (value <= 0 || value < this.corePoolSize) {
            throw new RangeError("IllegalArgumentException");
        }

        this.mMaximumPoolSize = value;

        if (this.poolSize > value) {
            this.interruptIdleFutures();
        }
    }

    get poolSize() {
        return this.mWorkers.length;
    }

    get queue() {
        return this.mWorkQueue;
    }

    get size() {
        return this.isCore() ? this.corePoolSize : this.maximumPoolSize;
    }

    get state() {
        return this.mState;
    }

    add(future, callback = null) {
        return this.push(future, false, 0, MILLISECONDS, callback);
    }

    addAll(futures = [], callback = null) {
        let modified = false;
        for (const future of futures) {
            if (this.add(future, callback)) {
                modified = true;
            }
        }
        return modified;
    }

    afterExecute(future, thrown=null) {

    }

    awaitTermination({timeout = 0, unit = MILLISECONDS} = {}) {
        let nanos = unit.toNanos(timeout);
        if (this.mState >= TERMINATED) {
            return true;
        }
        if (nanos <= 0) {
            return false;
        }
        return true;
    }

    beforeExecute(future) {

    }

    clear() {

    }

    contains(future) {
        return this.mWorkers.indexOf(future) !== -1 || this.mWorkQueue.contains(future) !== -1;
    }

    drainQueue() {
        let q = this.mWorkQueue;
        let taskList = [];
        q.drainTo(taskList);
        if (!q.isEmpty()) {
            for (const r of taskList) {
                q.remove(r);
            }
        }
        return taskList;
    }

    element() {
        return this.mWorkQueue.element();
    }

    ensurePrestart({timeout = 0, unit = MILLISECONDS, callback = null}={}) {
        return this.push(null, this.isCore(), timeout, unit, callback);
    }

    execute(r, ...params) {
        if (!r) {
            throw new ReferenceError("NullPointerException");
        }
        let size = this.isCore() ? this.corePoolSize : this.maximumPoolSize;
        if (this.isShutdown() ||
            this.donePoolSize >= this.maximumPoolSize || !(r instanceof Future || r.runnable)) {
            this.reject(r);
        } else {
            let timeout = params[0] || 0;
            let unit = params[1] || MILLISECONDS;
            let done = params[2];
            let callable = params[3];
            if (r.runnable) {
                timeout = r.timeout || 0;
                unit = r.unit || MILLISECONDS;
                done = r.done;
                r = r.runnable;
            }
            if (callable) {
                r.mCallable.compute = callable.compute;
            }
            r.get({timeout, unit, done});
            return r;
        }
        return null;
    }

    finalize() {
        this.shutdown();
    }

    getKeepAliveTime(unit = MILLISECONDS) {
        return unit.convert(this.keepAliveTime);
    }

    interruptIdleFutures(to = 0, onlyOne = false) {
        let len = this.mWorkers.length;
        while (len-- && len !== to) {
            let w = this.mWorkers[len];
            if (!w.isDone()) {
                if (!w.cancel()) {
                    w.finalize();
                }
                this.mWorkers.splice(len, 1);
                if (onlyOne) {
                    break;
                }
            }
        }
    }

    interruptFutures() {
        this.interruptIdleFutures();
    }

    isCore() {
        return this.poolSize < this.corePoolSize;
    }

    isCorePoolSize() {
        return this.poolSize === (this.isCore() ? this.corePoolSize : this.maximumPoolSize);
    }

    isDonePoolSize() {
        return this.donePoolSize === (this.isCore() ? this.corePoolSize : this.maximumPoolSize);
    }

    isRunning() {
        return this.mState === RUNNING;
    }

    isRunningOrShutdown() {
        return this.isRunning() || this.isShutdown();
    }

    isShutdown() {
        return this.mState >= SHUTDOWN;
    }

    isStop() {
        return this.mState >= STOP;
    }

    isTerminated() {
        return this.isShutdown() && this.isTerminating();
    }

    isTerminating() {
        return this.mState >= TERMINATED;
    }

    offer({timeout = 0, unit = MILLISECONDS, callable = null, runnable = null, result = null, callback = null} = {}) {
        let task = null;
        if (callable || runnable) {
            task = this.newTaskFor({callable, runnable, result});
        }
        if (!this.push(task, false, timeout, unit, callback)) {

        }
        return task;
    }

    onShutdown() {

    }

    peek() {
        return this.mWorkQueue.peek();
    }

    poll({timeout = 0, unit = MILLISECONDS, callable=null, done = null} = {}) {
        if (this.isShutdown() ||
            this.isStop() ||
            this.poolSize > this.maximumPoolSize) {
            return null;
        }
        return this.mWorkQueue.poll({
            timeout: this.allowCoreTimeOut ? this.keepAliveTime : 0,
            callback: (item = null) => {
                if (this.isStop() || item instanceof Error) {
                    this.reject(item);
                } else {
                    this.beforeExecute(item);
                    this.execute(item, timeout, unit, (result = null) => {
                        let thrown = null;
                        try {
                            done(result);
                        } catch (e) {
                            thrown = e;
                        } finally {
                            this.afterExecute(item, thrown);
                            this.releaseFuture(item, thrown !== null);
                        }
                    }, callable);
                }
            }
        });
    }

    prestart({timeout = 0, unit = MILLISECONDS, callable = null, callback = null, all=true}={}) {
        if (all) {
            let n = 0;
            while (this.push(null, this.isCore(), timeout, unit, callback, callable)) {
                ++n;
            }
            return n;
        }
        let core = this.isCore();
        return core && this.push(null, core, timeout, unit, callback, callable);
    }

    purge() {
        let q = this.mWorkQueue;
        let it = q.iterator();
        while (it.hasNext()) {
            let r = it.next();
            if (r instanceof Future && r.isCancelled()) {
                it.remove();
            }
        }
    }

    push(future = null, core = false, ...params) {
        if (this.isShutdown() ||
            this.isStop()) {
            return false;
        }
        let timeout = this.allowCoreTimeOut ? params[0] : 0;
        let unit = params[1] || MILLISECONDS;
        let callback = params[2];
        if (!future) {
            let callable = params[3] || {

                compute() {
                    this.signal();
                }

            };
            //this.poolSize >= (core ? this.corePoolSize : this.maximumPoolSize)
            future = this.newTaskFor({callable});
        }
        return this.mWorkQueue.offer(future, {
            timeout,
            unit,
            callback: (item = null) => {
                if (this.isStop() || item instanceof Error) {
                    this.reject(future);
                } else {
                    this.mWorkers.push(future);
                    this.largestPoolSize = this.poolSize;
                    if (callback) {
                        callback(item);
                    }
                }
            }
        });

    }

    reject(future) {

    }

    put(future, callback = null) {
        this.push(future, false, 0, MILLISECONDS, callback);
    }

    releaseFuture(future, completedAbruptly = false) {
        let index = this.mWorkers.indexOf(future);
        if (index !== -1) {
            this.mWorkers.splice(index, 1);
            if (!completedAbruptly) {
                this.mCompletedTaskCount++;
            }
            future.finalize();
        }
    }

    remove(future) {
        let removed = this.mWorkQueue.remove(future);
        if (removed) {
            this.tryTerminate();
        }
        return removed;
    }

    setKeepAliveTime(time = 0, unit = MILLISECONDS) {
        if (time < 0) {
            throw new RangeError("IllegalArgumentException");
        }
        if (time === 0 && this.allowCoreTimeOut) {
            throw new RangeError("IllegalArgumentException Core must have nonzero keep alive times");
        }
        let keepAliveTime = unit.toMillis(time);
        let delta = keepAliveTime - this.keepAliveTime;
        this.mKeepAliveTime = keepAliveTime;
        if (delta < 0) {
            this.interruptIdleFutures();
        }
    }

    shutdown() {
        if (this.mState < SHUTDOWN) {
            this.mState = SHUTDOWN;
            this.interruptFutures();
            this.onShutdown();
            this.tryTerminate();
        }
    }

    shutdownNow() {
        if (this.mState < STOP) {
            this.mState = STOP;
            let tasks = this.drainQueue();
            this.interruptFutures();
            this.tryTerminate();
            return tasks;
        }
        return null;
    }

    submit({callable = null, runnable = null, result = null, done = null} = {}) {
        let task = this.newTaskFor({callable, runnable, result, done});
        return this.execute(task);
    }

    take(done = null) {
        return this.poll({done});
    }

    terminated() {
    }

    tryTerminate() {
        if (!(this.mState >= TERMINATED) && (this.isShutdown() || this.isStop())) {
            this.mState = TERMINATED;
            this.terminated();
        }
    }

}
