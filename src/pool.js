export class Pool {
  constructor(doTask, limit) {
    this.doTask = doTask;
    this.queue = [];
    this.onDoing = [];
    this.limit = limit;
  }

  insertQueue(task){
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...task,
        resolve,
        reject
      });
      this.toDo();
    });
  }
  start(task){
    this.onDoing.push(task);
    this.doTask(task).then(
      () => {
        this.onDoing = this.onDoing.filter(item => item !== task);
        this.queue = this.queue.filter(item => item !== task);
        task.resolve();
        this.toDo();
      },
      (err) => task.reject(err)
    );
  }
  toDo(){
    let onDoingNum = this.onDoing.length;
    let availableNum = this.limit - onDoingNum;
    this.onDoing.forEach(task => this.queue = this.queue.filter(item => item !== task));
    this.queue.slice(0, availableNum).forEach((task, index) => {
      this.start(task);
    });
  }
}
