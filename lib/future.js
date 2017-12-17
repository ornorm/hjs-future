/** @babel */
import EventEmitter from 'events';
import {MILLISECONDS} from "hjs-core/lib/time";
import {Runnable} from "hjs-message/lib/handler";

export class Callable extends EventEmitter {

    constructor({compute = null} = {}) {
        super();
        if (compute) {
            this.compute = compute;
        }
        this.mResult = null;
    }

    cancel() {
        this.emit(Callable.CANCEL);
    }

    call() {
        if (this.mResult === null || this.mResult === undefined) {
            this.compute();
        }
        return this.mResult;
    }

    compute() {
    }

    getResult() {
        return this.mResult;
    }

    signal(result=null) {
        this.emit(Callable.COMPUTE, this.mResult = result);
    }

}
Callable.COMPUTE = "compute";
Callable.CANCEL = "cancel";

export class RunnablePromise extends Runnable {

    constructor({ handlePromise=null, process=null }={}) {
        super();
        if (handlePromise) {
            this.handlePromise = handlePromise;
        }
        if (process) {
            this.process = process;
        }
    }

    handlePromise(result) {

    }

    process(resolve, reject) {

    }

    run() {
        let p = new Promise((resolve, reject) => {
            this.process(resolve, reject);
        });
        p.then((result) => {
            this.handlePromise(result);
        })
        .catch((e) => {
            this.handlePromise(e);
        });

    }

}

export class RunnableAdapter extends Callable {

    constructor({task, result = null}) {
        super();
        if (!task) {
            throw new ReferenceError('NullPointerException');
        }
        this.mTask = task;
        this.mResult = null;
        this.mDefaultResult = result;
    }

    compute() {
        this.mTask.run(this);
    }

    getTask() {
        return this.mTask;
    }

    signal(result=null) {
        if (result === null || result === undefined) {
            this.emit(Callable.COMPUTE, this.mResult = this.mDefaultResult);
        } else {
            this.emit(Callable.COMPUTE, this.mResult = result);
        }
    }
}

export const FutureState = {
    NEW: 0,
    COMPLETING: 1,
    NORMAL: 2,
    EXCEPTIONAL: 3,
    CANCELLED: 4,
    INTERRUPTING: 5,
    INTERRUPTED: 6
};

export class Future extends EventEmitter {

    constructor() {
        super();
    }

    cancel(mayInterruptIfRunning=false) {
        return false;
    }

    get({
            timeout = 0,
            unit = MILLISECONDS,
            done=null
        } = {}) {
        return null;
    }

    isCancelled() {
        return false;
    }

    isDone() {
        return false;
    }

}
Future.DONE = "done";

export class RunnableFuture extends Future {

    constructor() {
        super();
    }

    run() {
    }
}