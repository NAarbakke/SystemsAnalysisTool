export class WorkerClient {
 private worker:Worker|null=null;private counter=0;
 private pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 constructor(private url:string,private module=false){}
 private stop(message:string){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();this.worker?.terminate();this.worker=null;}
 request<T>(payload:unknown,transfer:Transferable[]=[]):Promise<T>{
  if(!this.worker){this.worker=new Worker(this.url,this.module?{type:'module'}:undefined);this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(data.id);if(data.error)p.reject(new Error(data.error));else p.resolve(data.result);};this.worker.onerror=()=>this.stop('The model worker could not start. Reload the page and try again.');}
  const id=++this.counter;
  return new Promise<T>((resolve,reject)=>{this.pending.set(id,{resolve:resolve as (v:unknown)=>void,reject,timer:setTimeout(()=>this.stop('Processing timed out. Try a smaller assembly or reload to retry.'),120000)});this.worker!.postMessage({id,payload},transfer);});
 }
 dispose(){this.stop('Workspace closed.');}
}
