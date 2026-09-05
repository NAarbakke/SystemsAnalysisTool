type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type Context={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function registerWorkspaceTools(read:()=>unknown,configure:(amount:number)=>unknown){
 const context=(document as Document&{modelContext?:Context}).modelContext;if(!context?.registerTool)return()=>{};
 const lifetime=new AbortController();
 const tools:Tool[]=[{name:'read_assembly',description:'Read the current model parts and explosion percentage.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>read()},
 {name:'set_explosion_amount',description:'Pause playback and set the visible assembly explosion from 0 (assembled) to 100 (fully exploded).',inputSchema:{type:'object',properties:{amount:{type:'number',minimum:0,maximum:100}},required:['amount'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{if(!input||typeof input!=='object')throw new Error('Provide an amount.');const amount=(input as {amount:unknown}).amount;if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100||Object.keys(input).some(k=>k!=='amount'))throw new Error('Amount must be a number between 0 and 100.');return configure(amount);}}];
 for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch{/* Optional browser capability. */}}
 return()=>lifetime.abort();
}
