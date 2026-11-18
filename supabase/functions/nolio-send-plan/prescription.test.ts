import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { buildDescription, buildStructuredFromParts, normalizeStructuredWorkoutForNolio, prepareCurrentSession, summarizeStructuredWorkout } from "./index.ts";

const base={weekNumber:1,dayIndex:0,sessionIndex:0,isRest:false,sport:"run",title:"Séance",details:""};
const part=(text:string)=>[{part:"Main",text,zones:[]}];
const normalize=(text:string,sport=2,refs={})=>normalizeStructuredWorkoutForNolio(buildStructuredFromParts(part(text),refs),refs,sport) as Array<Record<string,unknown>>;

Deno.test("export: progressive tempo remains five steps and 50 minutes",()=>{
  const steps=normalize("15' Z2 + 10' Z2 haut + 10' Z3 + 5' Z4a + 10' Z1 cool");
  assertEquals(steps.length,5);
  assertEquals(summarizeStructuredWorkout(steps).durationSec,3000);
});
Deno.test("export: r=3min is kept between repetitions without a two-minute default",()=>{
  const steps=normalize("4x6min Z4 r=3min Z1");
  assertEquals(steps.filter(s=>s.intensity_type==="rest").map(s=>s.step_duration_value),[180,180,180]);
  assertEquals(summarizeStructuredWorkout(steps).durationSec,1980);
});
Deno.test("export: run distance is preserved even with VMA available",()=>{
  const steps=normalize("10x400m à 4:00-4:10/km r=60s trot",2,{vma:18});
  const work=steps.filter(s=>s.intensity_type!=="rest");
  assertEquals(work.length,10);
  assertEquals(work.map(s=>[s.step_duration_type,s.step_duration_value]),Array.from({length:10},()=>["distance",400]));
  assertEquals(work[0].target_type,"pace");
  assertEquals(work[0].target_value_min,4);
  assertEquals(work[0].target_value_max,4.167);
});
Deno.test("export: absolute watts are not replaced by athlete percentages",()=>{
  const steps=normalize("15min 200-250 W",14,{ftp:210});
  assertEquals(steps[0].target_type,"power");
  assertEquals(steps[0].target_value_min,200);
  assertEquals(steps[0].target_value_max,250);
});
Deno.test("export: free recovery does not acquire an invented power target",()=>{
  const steps=normalize("3x5min 90-95% FTP r=1min libre",14,{ftp:210});
  assertEquals(steps.filter(s=>s.intensity_type==="rest").map(s=>s.target_type),["no_target","no_target"]);
});
Deno.test("export: swim blocks have no unprescribed 60-second pauses",()=>{
  const steps=normalize("200m souple + 800m à 1:30-1:35/100m + 100m souple",19,{css:90});
  assertEquals(steps.length,3);
  assertEquals(steps[1].target_type,"pace_min100");
  assertEquals(steps[1].target_value_min,1.053);
  assertEquals(steps[1].target_value_max,1.111);
  assertEquals(steps.map(s=>s.step_duration_type),["distance","distance","distance"]);
});
Deno.test("export: nested repeats preserve all work and recovery",()=>{
  const steps=normalize("2x(6x30s Z5/30s Z1) R=4min Z1");
  assertEquals(steps.filter(s=>s.intensity_type==="active").length,12);
  assertEquals(summarizeStructuredWorkout(steps).durationSec,960);
});
Deno.test("export: explicit swim-bike segments retain their own sports and units",()=>{
  const sessions=prepareCurrentSession({...base,sport:"brick",details:"Main: Natation: 1500m à 1:30-1:35/100m + Vélo: 45min 180-210 W"},{});
  assertEquals(sessions.map(s=>s.sport),["natation","cyclisme"]);
  const swim=normalizeStructuredWorkoutForNolio(sessions[0].structuredWorkout,{},19) as Array<Record<string,unknown>>;
  const bike=normalizeStructuredWorkoutForNolio(sessions[1].structuredWorkout,{},14) as Array<Record<string,unknown>>;
  assertEquals(swim[0].target_type,"pace_min100");
  assertEquals(bike[0].target_type,"power");
  assertEquals(sessions.map(s=>s.exportPartIndex),[0,1]);
});
Deno.test("export: ambiguous bricks and contradictory units are reported before calendar writes",()=>{
  assertThrows(()=>prepareCurrentSession({...base,sport:"brick",details:"60min Z2"},{}));
  assertThrows(()=>prepareCurrentSession({...base,details:"10min 200-250 W"},{}));
});
Deno.test("export: an occurrence retains its own repetitions even with a catalogue ID",()=>{
  const [session]=prepareCurrentSession({...base,id:"B_RUN_TEMPO_PROGRESSIVE",details:"Main: 4x6min Z4 r=3min Z1"},{});
  assertEquals((session.structuredWorkout??[]).filter(s=>s.intensity_type==="active").length,4);
  assertEquals(summarizeStructuredWorkout(session.structuredWorkout).durationSec,1980);
});
Deno.test("export: explicit caller-built test guidance remains authoritative",()=>{
  const workout=[{type:"step" as const,intensity_type:"active" as const,step_duration_type:"duration" as const,step_duration_value:600,target_type:"no_target" as const}];
  const [session]=prepareCurrentSession({...base,details:"Test terrain",structuredWorkout:workout},{});
  assertEquals(session.structuredWorkout,workout);
});
Deno.test("description: objective does not erase the prescription",()=>{
  const text=buildDescription({...base,objectif:"Coordination",details:"3 tours de 10 squats et 20 secondes d'équilibre"});
  assertEquals(text.includes("Coordination"),true);
  assertEquals(text.includes("3 tours"),true);
});
Deno.test("description: repeated Main parts are all retained",()=>{
  const text=buildDescription({...base,objectif:"Endurance",structure:[...part("200m souple"),...part("800m CSS")]});
  assertEquals(text.includes("200m souple"),true);
  assertEquals(text.includes("800m CSS"),true);
});

Deno.test("summary: a heart-rate target is never treated as a speed for a distance",()=>{
  const summary=summarizeStructuredWorkout([{type:"step",step_duration_type:"distance",step_duration_value:400,target_type:"heartrate",target_value:150}]);
  assertEquals(summary.durationSec,0);
  assertEquals(summary.distanceMeters,400);
  assertEquals(summary.durationComplete,false);
});
Deno.test("summary: missing pace must not turn rest time into the session total",()=>{
  const steps=normalize("10x400m Z4 r=60s libre",2,{fcMax:185});
  const summary=summarizeStructuredWorkout(steps);
  assertEquals(summary.distanceMeters,4000);
  assertEquals(summary.durationComplete,false);
});

Deno.test("swim: CSS+3-5 sec is a pace offset, never an added duration",()=>{
  const steps=normalize("4x100m CSS+3-5 sec/100m r=15s",19,{css:90});
  assertEquals(steps.filter(s=>s.intensity_type!=="rest").length,4);
  assertEquals(steps[0].step_duration_value,100);
  assertEquals(steps[0].target_type,"pace_min100");
  assertEquals(steps[0].target_value_min,1.053);
  assertEquals(steps[0].target_value_max,1.075);
  assertEquals(steps.filter(s=>s.intensity_type==="rest").map(s=>s.step_duration_value),[15,15,15]);
});

Deno.test("swim: both CSS offset endpoints survive a relative pace range",()=>{
  const steps=normalize("800m CSS-2s-CSS+5s",19,{css:90});
  assertEquals(steps[0].target_value_min,1.053);
  assertEquals(steps[0].target_value_max,1.136);
});

Deno.test("swim: a distance recovery remains a recovery, unlike a pace denominator",()=>{
  const steps=normalize("4x100m Z4 / 100m souple",19,{css:90});
  assertEquals(steps.filter(s=>s.intensity_type==="rest").map(s=>s.step_duration_value),[100,100,100,100]);
});

Deno.test("start to run: walking and jogging remain distinct in watch guidance",()=>{
  const structured=buildStructuredFromParts(part("8x(1min trot facile + 2min marche)"),{});
  const steps=normalizeStructuredWorkoutForNolio(structured,{},2,true,false) as Array<Record<string,unknown>>;
  assertEquals(steps.length,16);
  assertEquals(String(steps[0].name).includes("Course · RPE 5/10"),true);
  assertEquals(String(steps[1].name).includes("Marche · RPE 3/10"),true);
  assertEquals(String(steps[1].comment).includes("2min marche"),true);
});

Deno.test("recovery: a free rest never inherits the Main part's threshold zone",()=>{
  const steps=buildStructuredFromParts([{part:"Main",text:"4x6min Z4 r=1min libre",zones:["Z4"]}],{fcMax:185});
  assertEquals(steps.filter(s=>s.type==="step"&&s.intensity_type==="rest").map(s=>s.type==="step"?s.target_type:null),["no_target","no_target","no_target"]);
  assertEquals(steps.filter(s=>s.type==="step"&&s.intensity_type==="active").every(s=>s.type==="step"&&s.target_type==="heartrate"),true);
});
