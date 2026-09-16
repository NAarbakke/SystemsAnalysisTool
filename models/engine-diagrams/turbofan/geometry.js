// Authored illustration coordinates, not engineering dimensions or stage specifications.
const mirror = draw => [1,-1].map(sign => `<g transform="translate(0 280) scale(1 ${sign})">${draw}</g>`).join('');

export function fan() {
 const blades = Array.from({length:5},(_,i)=>{
  const x=168+i*7;
  return `<path class="fan-blade" d="M${x} 33C${x+16} 65 ${x+24} 105 ${x+9} 143L${x+25} 143C${x+44} 96 ${x+29} 51 ${x+14} 33Z"/>`;
 }).join('');
 return mirror(blades)+`<rect class="rotor-disc" x="176" y="247" width="65" height="66" rx="6"/><path class="spinner" d="M80 280Q117 248 185 249L241 257V303L185 311Q117 312 80 280Z"/><path class="surface-line" d="M96 280H229"/>`;
}

export function compressor() {
 return mirror(Array.from({length:9},(_,i)=>{
  const x=322+i*27, tip=79-i*3.4, hub=27+i*1.2;
  return `<g><path class="rotor-disc" d="M${x-7} 20H${x+9}L${x+11} ${hub}H${x-9}Z"/><path class="compressor-blade" d="M${x-4} ${hub}Q${x-10} ${(tip+hub)/2} ${x-1} ${tip}L${x+8} ${tip-1}Q${x+2} ${(tip+hub)/2} ${x+6} ${hub}Z"/><path class="stator" d="M${x+15} ${tip+3}H${x+22}L${x+18} ${hub+7}H${x+14}Z"/></g>`;
 }).join(''));
}

export function turbine() {
 return mirror(Array.from({length:5},(_,i)=>{
  const x=734+i*32, tip=50+i*5, hub=29-i*2;
  return `<g><path class="turbine-disc" d="M${x-8} 16H${x+10}L${x+14} ${hub}H${x-11}Z"/><path class="turbine-blade" d="M${x-8} ${hub}Q${x+10} ${hub+7} ${x-4} ${tip}H${x+8}Q${x+24} ${hub+9} ${x+3} ${hub}Z"/><path class="hot-stator" d="M${x-17} ${tip+3}H${x-10}L${x-14} ${hub+6}H${x-20}Z"/></g>`;
 }).join(''));
}

export function bearings() {
 return [284,895].map(x=>mirror(`<rect class="bearing-housing" x="${x-14}" y="10" width="28" height="32" rx="2"/><path class="section-hatch" d="M${x-14} 10H${x+14}V42H${x-14}Z"/><rect class="bearing-race" x="${x-10}" y="19" width="20" height="13" rx="2"/><circle class="bearing-ball" cx="${x-5}" cy="25.5" r="4"/><circle class="bearing-ball" cx="${x+5}" cy="25.5" r="4"/>`)).join('');
}

export function frontInset() {
 return `<g class="fan-inset" transform="translate(1060 124)"><circle class="inset-frame" r="77"/><circle class="inset-cavity" r="63"/>${Array.from({length:22},(_,i)=>`<path class="fan-blade" transform="rotate(${i*360/22})" d="M-5-17Q-19-32-13-60L-3-62Q-9-35 3-17Z"/>`).join('')}<circle class="spinner" r="18"/><path class="surface-line" d="M-8-6Q0-16 10-6"/><text class="zone-label" y="101">FAN · FRONT VIEW</text></g>`;
}


