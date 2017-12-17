/** @babel */
import {MILLISECONDS,UncaughtExceptionHandler} from 'hjs-core/lib/time';
import {Runnable,MessageHandler} from 'hjs-message/lib/handler';
import {Queue} from 'hjs-collection/lib/queue';
import {Executors,BlockingExecutor} from './executor';

export const AsyncTaskStatus = {
    NONE: -1,
    PENDING: 0,
    RUNNING: 1,
    FINISHED: 2
};

export class AsyncRunnable extends Runnable {

    constructor({run = null, task = null, params = null} = {}) {
        super({run: run});
        if (task !== null) {
            this.mTask = task;
        }
        if (params !== null) {
            this.mParams = params;
        }
    }

}

export class AsyncTaskResult {

    constructor({task = null, data = null} = {}) {
        if (task !== null) {
            this.mTask = task;
        }
        if (data !== null) {
            this.mData = data;
        }
    }

}

export class AsyncTaskListener {

    constructor({task = null, onFinished = null} = {}) {
        if (task !== null) {
            this.mTask = task;
        }
        if (onFinished !== null) {
            this.onFinished = onFinished;
        }
    }

    onFinished(result) {
    }

}

const MESSAGE_POST_RESULT = 0x1;

const MESSAGE_POST_PROGRESS = 0x2;

const sDefaultHandler = MessageHandler.create({

    handleMessage: (msg) => {
        let result = msg.getObj();
        switch (msg.getWhat()) {
            case MESSAGE_POST_RESULT:
                result.mTask.finish(result.mData);
                break;
            case MESSAGE_POST_PROGRESS:
                result.mTask.onProgressUpdate(result.mData);
                break;
        }
    }

});

let sDefaultExecutor = Executors.newSerialExecutor({capacity: 128});

export class AsyncTask {

    constructor({
                    executor = null,
                    handler = null,
                    doInBackground = null,
                    onCancelled = null,
                    onPostExecute = null,
                    onPreExecute = null,
                    onProgressUpdate = null,
                    reuse = true
                } = {}) {
        this.init({
            executor,
            handler,
            doInBackground,
            onCancelled,
            onPostExecute,
            onPreExecute,
            onProgressUpdate,
            reuse
        });
    }

    addTaskListener(listener) {
        this.mTaskListener = listener;
    }

    cancel() {
        return this.mIsCancelled = !(this.mStatus === AsyncTaskStatus.FINISHED);
    }

    doInBackground(params) {

    }

    execute(params, uptimeMillis = 0, token = null) {
        if (this.mReuse &&
            this.mStatus === AsyncTaskStatus.RUNNING) {
            if (this.mPendingTasks.offer({params, uptimeMillis, token})) {
                return this;
            }
        }
        return this.internalExecute(params, uptimeMillis, token);
    }

    executeOnExecutor(executor, params) {
        if (this.mStatus !== AsyncTaskStatus.PENDING) {
            switch (this.mStatus) {
                case AsyncTaskStatus.RUNNING:
                    throw new Error("IllegalStateException Cannot execute task:"
                        + " a task not recyclable is already running.");
                case AsyncTaskStatus.FINISHED:
                    throw new Error("IllegalStateException Cannot execute task:"
                        + " the task has already been executed "
                        + "(a task not recyclable can be executed only once)");
            }
        }
        this.mStatus = AsyncTaskStatus.RUNNING;
        this.onPreExecute();
        let ar = new AsyncRunnable({
            task: this,
            params: params,
            run: () => {
                let t = ar.mTask;
                let listener = new AsyncTaskListener({
                    task: t,
                    onFinished: (result) => {
                        t.mTaskInvoked = true;
                        t.postResult(result);
                        t.removeTaskListener(listener);
                    }
                });
                ar.mTask.addTaskListener(listener);
                try {
                    t.doInBackground(ar.mParams);
                } catch (e) {
                    t.mTaskInvoked = false;
                    t.postResultIfNotInvoked(e);
                    t.removeTaskListener(listener);
                }
            }
        });
        executor.execute(ar);
        return this;
    }

    static executeOnPromise({
                                executor = null,
                                handler = null,
                                doInBackground = null,
                                onPreExecute = null,
                                onProgressUpdate = null,
                                reuse = true,
                                params = null,
                                uptimeMillis = 0,
                                token = null
                            } = {}) {
        return new Promise((resolve, reject) => {
            new AsyncTask({
                executor,
                handler,
                doInBackground,
                onCancelled: reject,
                onPostExecute: resolve,
                onPreExecute,
                onProgressUpdate,
                reuse
            }).execute(params, uptimeMillis, token);
        });
    }

    finalize() {
        if (this.mStatus === AsyncTaskStatus.FINISHED) {
            this.mStatus = AsyncTaskStatus.NONE;
            this.mUseExecutor = false;
            this.mTaskInvoked = false;
            this.mIsCancelled = false;
            this.mReuse = false;
            this.mTaskListener = null;
            this.mPendingTasks = null;
            this.mExecutor = null;
            this.mHandler = null;
            this.mResult = null;
        }
    }

    finish(result) {
        this.mStatus = AsyncTaskStatus.FINISHED;
        if (this.isCancelled()) {
            this.onCancelled(result);
        } else {
            this.onPostExecute(result);
        }
        if (this.mExecutor instanceof BlockingExecutor) {
            this.mExecutor.scheduleNext();
        }
        if (!this.mReuse) {
            this.finalize();
        } else {
            this.recycle();
            let task = this.mPendingTasks.poll();
            if (task !== null) {
                this.execute(task.params, task.uptimeMillis, task.token);
            }
        }
    }

    get({
            onComplete,
            timeout = 0,
            unit = MILLISECONDS
        } = {}) {
        if (!(this.isInvoked() || this.isCancelled())) {
            this.wait({
                timeout,
                unit,
                onComplete: () => {
                    let done = this.isInvoked() || this.isCancelled();
                    if (done) {
                        onComplete(this.mResult);
                    }
                    return done;
                },
                uncaughtExceptionHandler: new UncaughtExceptionHandler({

                    uncaughtException: (e) => {
                        let done = this.isInvoked() || this.isCancelled();
                        if (!done) {
                            this.cancel();
                        }
                        onComplete(e);
                    }

                })
            });
            return null;
        }
        return this.mResult;
    }

    getExecutor() {
        return this.mExecutor;
    }

    getHandler() {
        return this.mHandler;
    }

    getStatus() {
        return this.mStatus;
    }

    init({
             executor = null,
             handler = null,
             doInBackground = null,
             onCancelled = null,
             onPostExecute = null,
             onPreExecute = null,
             onProgressUpdate = null,
             reuse = true
         } = {}) {
        this.mStatus = AsyncTaskStatus.NONE;
        this.mPendingTasks = new Queue(126);
        this.mUseExecutor = executor !== null;
        this.mExecutor = executor || sDefaultExecutor;
        this.mHandler = handler || sDefaultHandler;
        this.mReuse = reuse;
        if (doInBackground) {
            this.doInBackground = doInBackground;
        }
        if (onCancelled) {
            this.onCancelled = onCancelled;
        }
        if (onPostExecute) {
            this.onPostExecute = onPostExecute;
        }
        if (onPreExecute) {
            this.onPreExecute = onPreExecute;
        }
        if (onProgressUpdate) {
            this.onProgressUpdate = onProgressUpdate;
        }
        this.mIsCancelled = false;
        this.mTaskInvoked = false;
    }

    internalExecute(params, uptimeMillis = 0, token = null) {
        let executor = null;
        if (uptimeMillis <= 0) {
            if (!this.mUseExecutor) {
                executor = token !== null ?
                    Executors.newPostAtTimeExecutor(this.mHandler, token, uptimeMillis) :
                    Executors.newPostDelayedExecutor(this.mHandler, uptimeMillis);
            } else {
                executor = token !== null ?
                    Executors.postExecutorAtTime(this.mHandler, this.mExecutor, token, uptimeMillis) :
                    Executors.postExecutorDelayed(this.mHandler, this.mExecutor, uptimeMillis);
            }
        } else {
            executor = !this.mUseExecutor ?
                Executors.newPostExecutor(this.mHandler) : this.mExecutor;
        }
        return this.executeOnExecutor(executor, params);
    }

    isCancelled() {
        return this.mIsCancelled;
    }

    isInvoked() {
        return this.mTaskInvoked;
    }

    isUsingExecutor() {
        return this.mUseExecutor;
    }

    join({
             onComplete,
             timeout = 0,
             unit = MILLISECONDS,
             uncaughtExceptionHandler = null
         } = {}) {
        unit.timedJoin(onComplete, timeout, uncaughtExceptionHandler);
    }

    notify(result) {
        this.mResult = result;
        if (this.mTaskListener !== null) {
            this.mTaskListener.onFinished(result);
        } else {
            this.mTaskInvoked = true;
            this.postResult(result);
        }
    }

    onCancelled(result) {
    }

    onPostExecute(result) {
    }

    onPreExecute() {
    }

    onProgressUpdate(values) {
    }

    postResult(result) {
        this.mHandler.obtainMessage({
            what: MESSAGE_POST_RESULT,
            obj: new AsyncTaskResult({task: this, data: result}),
            target: this.mHandler
        }).sendToTarget();
        return result;
    }

    postResultIfNotInvoked(result) {
        let wasTaskInvoked = this.mTaskInvoked;
        if (!wasTaskInvoked) {
            this.postResult(result);
        }
    }

    publishProgress(values) {
        if (!this.isCancelled()) {
            this.mHandler.obtainMessage({
                what: MESSAGE_POST_PROGRESS,
                obj: new AsyncTaskResult({task: this, data: values}),
                target: this.mHandler
            }).sendToTarget();
        }
    }

    recycle() {
        if (this.mStatus === AsyncTaskStatus.NONE ||
            this.mStatus === AsyncTaskStatus.FINISHED) {
            this.mStatus = AsyncTaskStatus.PENDING;
        }
    }

    removeTaskListener(listener) {
        if (this.mTaskListener === listener) {
            this.mTaskListener = null;
        }
    }

    static setDefaultExecutor(executor) {
        sDefaultExecutor = executor;
    }

    setExecutor(executor) {
        this.mExecutor = executor;
    }

    setHandler(handler) {
        this.mHandler = handler;
    }

    sleep({
              onComplete,
              timeout = 0,
              unit = MILLISECONDS,
              uncaughtExceptionHandler = null
          } = {}) {
        unit.sleep(onComplete, timeout, uncaughtExceptionHandler);
    }

    wait({
             onComplete,
             timeout = 0,
             unit = MILLISECONDS,
             uncaughtExceptionHandler = null
         } = {}) {
        unit.timedWait(onComplete, timeout, uncaughtExceptionHandler);
    }
}
