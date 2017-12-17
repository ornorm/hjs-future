/** @babel */
import {LinkedList} from 'hjs-collection/lib/list';
import {Executors} from './executor';

const sPendingWorkFinishers = new LinkedList();

let sSingleExecutor = null;

export class QueuedWork {

    constructor() {
    }

    static add(finisher) {
        sPendingWorkFinishers.add(finisher);
    }

    hasPendingWork() {
        return !sPendingWorkFinishers.isEmpty();
    }

    remove(finisher) {
        sPendingWorkFinishers.remove(finisher);
    }

    singleExecutor() {
        if (sSingleExecutor === null) {
            sSingleExecutor = Executors.newSingleExecutor();
        }
        return sSingleExecutor;
    }

    waitToFinish() {
        for (let toFinish; (toFinish = sPendingWorkFinishers.poll()) !== null;) {
            toFinish.run();
        }
    }

}
