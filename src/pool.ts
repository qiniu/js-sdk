export class Pool {
  constructor(runTask, limit) {
    this.runTask = runTask;
    this.queue = [];
    this.processing = [];
    this.limit = limit;
  }

  enqueue(task){
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });
      this.check();
    });
  }
  run(item){
    this.queue = this.queue.filter(v => v !== item);
    this.processing.push(item);
    this.runTask(item.task).then(
      () => {
        this.processing = this.processing.filter(v => v !== item);
        item.resolve();
        this.check();
      },
      (err) => item.reject(err)
    );
  }
  check(){
    let processingNum = this.processing.length;
    let availableNum = this.limit - processingNum;
    this.queue.slice(0, availableNum).forEach((item, index) => {
      this.run(item);
    });
  }
}
