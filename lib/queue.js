/** @babel */
import EventEmitter from 'events';
import * as util from 'hjs-core/lib/util';
import {MILLISECONDS} from "hjs-core/lib/time";
import {Iterator} from 'hjs-collection/lib/iterator';
import {LinkedNode} from 'hjs-collection/lib/list';
import {AbstractQueue} from 'hjs-collection/lib/queue';

export class BlockingQueue extends AbstractQueue {

    constructor() {
        super();
        this.mEventEmitter = new EventEmitter();
    }

    isAvailable() {
        return !this.isEmpty();
    }

    isEmpty() {
        return true;
    }

    offer(e, {
        timeout = 0,
        unit = MILLISECONDS,
        callback = null
    } = {}) {
        return false;
    }

    poll({
             timeout = 0,
             unit = MILLISECONDS,
        listener = null
         } = {}) {
        return null;
    }

    put(e, callback = null) {
    }

    remainingCapacity() {
        return 0;
    }

    take(callback = null) {
        return null;
    }
}

export class LinkedBlockingQueueIterator extends Iterator {

    constructor(list = []) {
        super(list);
        this.mLastRet = null;
        this.mCurrentElement = null;
        this.mCurrent = this.list.mHead.next;
        if (this.mCurrent) {
            this.mCurrentElement = this.mCurrent.item;
        }
    }

    hasNext() {
        return this.mCurrent !== null || this.mCurrent !== undefined;
    }

    next() {
        if (!this.mCurrent) {
            throw new RangeError("NoSuchElementException");
        }
        let x = null;
        this.mLastRet = this.mCurrent;
        for (let p = this.mCurrent, item, q; ; p = q) {
            if ((q = p.next) === p) {
                q = this.list.mHead.next;
            }
            if (!q || (item = q.item) !== null) {
                this.mCurrent = q;
                x = this.mCurrentElement;
                this.mCurrentElement = item;
                return x;
            }
        }
        return null;
    }

    remove() {
        if (!this.mLastRet) {
            throw new RangeError("NoSuchElementException");
        }
        this.mLastRet = null;
        let node = this.mLastRet;
        for (let trail = this.list.mHead, p = trail.next; p !== null; trail = p, p = p.next) {
            if (p === node) {
                this.list.unlink(p, trail);
                break;
            }
        }
    }

}

const NO_ID = -1;

export class LinkedBlockingQueue extends BlockingQueue {

    constructor({ capacity = Number.MAX_VALUE, data = [] } = {}) {
        super();
        this.mCount = 0;
        this.mLast = this.mHead = new LinkedNode();
        if (data.length > 0) {
            this.mCapacity = data.length;
            let n = 0;
            for (const v of data) {
                if (!util.isDefined(v)) {
                    throw new ReferenceError("NullPointerException");
                }
                if (n === this.mCapacity) {
                    throw new RangeError("IllegalStateException Queue full");
                }
                this.enqueue(new LinkedNode({item: v}));
                ++n;
            }
            this.mCount = n;
        } else {
            if (capacity < 0) {
                throw new RangeError("IllegalArgumentException");
            } else {
                this.mCapacity = capacity;
            }
        }
    }

    add(e, callback=null) {
        let success = this.offer(e, { callback });
        if (!success) {
            throw new RangeError("IllegalStateException Queue full");
        }
        return success;
    }

    addAll(collection=[], callback=null) {
        if (!util.isDefined(collection)) {
            throw new ReferenceError("NullPointerException");
        }
        let modified = false;
        for (const v of collection) {
            if (this.add(v, callback)) {
                modified = true;
            }
        }
        return modified;
    }

    clear() {
        this.stopListeners(0x16);
        for (let p, h = this.mHead; (p = h.next); h.next = h) {
            p.item = null;
        }
        this.mHead = this.mLast;
        this.mCount = 0;
    }

    contains(o) {
        if (!util.isDefined(o)) {
            return false;
        }
        for (let p = this.mHead.next; p; p = p.next) {
            if (o === p.item) {
                return true;
            }
        }
        return false;
    }

    drainTo(c, maxElements = Number.MAX_VALUE) {
        if (!util.isDefined(c)) {
            throw new ReferenceError("NullPointerException");
        }
        if (!Array.isArray(c) || maxElements <= 0) {
            return 0;
        }
        let p = null;
        let n = Math.min(maxElements, this.mCount);
        let h = this.mHead;
        let i = 0;
        while (i < n) {
            p = h.next;
            c.push(p.item);
            p.item = null;
            h.next = h;
            h = p;
            ++i;
        }
        if (i > 0) {
            this.mHead = h;
            this.mCount = this.mCount - i;
        }
        return n;
    }

    dequeue() {
        let h = this.mHead;
        let first = h.next;
        if (first) {
            h.next = h;
            this.mHead = first;
            let x = first.item;
            first.item = null;
            return x;
        }
        return first;
    }

    element() {
        let x = this.peek();
        if (!util.isDefined(x)) {
            throw new ReferenceError("NoSuchElementException");
        }
        return x;
    }

    enqueue(node) {
        this.mLast = this.mLast.next = node;
    }

    isAvailable() {
        return this.mCount <= this.mCapacity;
    }

    isEmpty() {
        return this.mCount === 0;
    }

    iterator() {
        return new LinkedBlockingQueueIterator(this);
    }

    offer(e, { timeout = 0, unit = MILLISECONDS, callback = null } = {}) {
        if (!util.isDefined(e)) {
            throw new ReferenceError("NullPointerException");
        }
        let node = new LinkedNode({ item: e });
        if (this.isAvailable()) {
            return this.offerNode({ node, callback });
        }
        let waitId = NO_ID;
        let millis = !timeout ? 0 : unit.toMillis(timeout);
        let wait = (future=null, time=0) => {
            if (this.offerNode({ node, time, millis, callback })) {
                this.stopListeners(0x4, wait);
            }
            clearTimeout(waitId);
            waitId = NO_ID;
        };
        this.startListeners(0x4, wait);
        let err = (e) => {
            this.stopListeners(0x4, wait);
            this.stopListeners(0x2, err);
        };
        this.startListeners(0x2, err);
        if (timeout) {
            let time = Date.now();
            waitId = setTimeout((time) => {
                wait(null, time);
            }, millis, time);
        }
        return false;
    }

    offerNode({ node, time=0, millis=0, callback = null }={}) {
        let now = Date.now();
        let ellapsed =  now - time;
        let expired = ellapsed !== now && ellapsed > millis;
        let available = false;
        let item = null;
        if (expired) {
            item = new RangeError("TimeoutException");
            callback(item);
            this.mEventEmitter.emit(LinkedBlockingQueue.EXCEPTION, item);
        } else {
            available = this.isAvailable();
            if (available) {
                this.mCount++;
                this.enqueue(node);
                item = node.item;
                callback(item);
                this.mEventEmitter.emit(LinkedBlockingQueue.OFFER, item);
            }
        }
        return available;
    }

    peek() {
        return !this.isEmpty() ? this.mHead.next.item : null;
    }

    poll({ timeout = 0, unit = MILLISECONDS, callback= null } = {}) {
        if (!this.isEmpty()) {
            return this.pollNode({ callback });
        }
        let waitId = NO_ID;
        let millis = !timeout ? 0 : unit.toMillis(timeout);
        let wait = (future=null, time=0) => {
            if (this.pollNode({ time, millis, callback })) {
                this.stopListeners(0x8, wait);
            }
            clearTimeout(waitId);
            waitId = NO_ID;
        };
        this.startListeners(0x8, wait);
        let err = (e) => {
            this.stopListeners(0x8, wait);
            this.stopListeners(0x2, err);
        };
        this.startListeners(0x2, err);
        if (timeout) {
            let time = Date.now();
            waitId = setTimeout((time) => {
                wait(null, time);
            }, millis, time);
        }
        return null;
    }

    pollNode({ time=0, millis=0, callback = null }={}) {
        let now = Date.now();
        let ellapsed =  now - time;
        let expired = ellapsed !== now && ellapsed > millis;
        let item = null;
        if (expired) {
            item = new RangeError("TimeoutException");
            callback(item);
            this.mEventEmitter.emit(LinkedBlockingQueue.EXCEPTION, item);
        } else {
            if (!this.isEmpty()) {
                this.mCount--;
                item = this.dequeue();
                callback(item);
                this.mEventEmitter.emit(LinkedBlockingQueue.POLL, item);
            }
        }
        return item;
    }

    put(e, callback=null) {
        this.offer(e, { callback });
    }

    remainingCapacity() {
        return this.mCapacity - this.mCount;
    }

    remove(e) {
        if (!util.isDefined(e)) {
            return false;
        }
        for (let trail = this.mHead, p = trail.next; p !== null; trail = p, p = p.next) {
            if (e === p.item) {
                this.unlink(p, trail);
                this.mCount = this.mCount - 1;
                return true;
            }
        }
        return false;
    }

    size() {
        return this.mCount;
    }

    startListeners(flag=0, listener=null) {
        switch (flag) {
            case 0x16:
                this.mEventEmitter.on(LinkedBlockingQueue.OFFER, listener);
                this.mEventEmitter.on(LinkedBlockingQueue.POLL, listener);
                this.mEventEmitter.on(LinkedBlockingQueue.EXCEPTION, listener);
            case 0x8:
                this.mEventEmitter.on(LinkedBlockingQueue.OFFER, listener);
                break;
            case 0x4:
                this.mEventEmitter.on(LinkedBlockingQueue.POLL, listener);
                break;
            case 0x2:
                this.mEventEmitter.on(LinkedBlockingQueue.EXCEPTION, listener);
                break;
        }
    }

    stopListeners(flag=0, listener=null) {
        switch (flag) {
            case 0x16:
            default:
                if (!listener) {
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.OFFER);
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.POLL);
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.EXCEPTION);
                } else {
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.OFFER, listener);
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.POLL, listener);
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.EXCEPTION, listener);
                }
                break;
            case 0x8:
                if (!listener) {
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.OFFER);
                } else {
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.OFFER, listener);
                }
                break;
            case 0x4:
                if (!listener) {
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.POLL);
                } else {
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.POLL, listener);
                }
            case 0x2:
                if (!listener) {
                    this.mEventEmitter.removeAllListeners(LinkedBlockingQueue.EXCEPTION);
                } else {
                    this.mEventEmitter.removeListener(LinkedBlockingQueue.EXCEPTION, listener);
                }
                break;
        }
    }

    take(callback = null) {
        return this.poll({ callback });
    }

    toArray(list = []) {
        let k = 0;
        for (let p = this.mHead.next; p !== null; p = p.next) {
            list[k] = p.item;
            k++;
        }
    }

    unlink(p, tail) {
        p.item = null;
        tail.next = p.next;
        if (this.mLast === p) {
            this.mLast = tail;
        }
    }

}

LinkedBlockingQueue.OFFER = "offer";
LinkedBlockingQueue.POLL = "poll";
LinkedBlockingQueue.EXCEPTION = "exception";
