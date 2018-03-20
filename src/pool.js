export class Pool {
  constructor(doTask, limit) {
    this.doTask = doTask;
    this.queue = [];
    this.processing = [];
    this.limit = limit;
    this.abort = false;
  }

  insertQueue(task){
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });
      this.toDo();
    });
  }
  start(item){
    this.queue = this.queue.filter(v => v !== item);
    this.processing.push(item);
    this.doTask(item.task).then(
      () => {
        this.processing = this.processing.filter(v => v !== item);
        item.resolve();
        if (!this.abort){
          this.toDo();
        } 
      },
      (err) => item.reject(err)
    );
  }
  toDo(){
    let processingNum = this.processing.length;
    let availableNum = this.limit - processingNum;
    this.queue.slice(0, availableNum).forEach((item, index) => {
      this.start(item);
    });
  }
}
