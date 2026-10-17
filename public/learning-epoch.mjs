export const epochOf=value=>String(value?.learningEpoch??'0');
export const acceptsSaved=(saved,remote)=>!!saved&&epochOf(saved)===epochOf(remote);

export function clearLearningCache(storage,uid,runId='') {
  const exact=new Set(['v1','seen-dex','told-dex','seen-items','board-seen','goal-step'].map(k=>`science-world:${k}:${uid}`));
  if(runId)exact.add('science-world:res-seen:'+runId);
  const prefixes=[`science-inquiry-draft:${uid}:`,`science-world:activity:${uid}:`,`science-world:pace-seen:${uid}:`];
  const remove=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(exact.has(key)||prefixes.some(prefix=>key?.startsWith(prefix)))remove.push(key);
  }
  remove.forEach(key=>storage.removeItem(key));
}
